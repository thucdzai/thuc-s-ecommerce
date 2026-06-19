const env = require('../../config/env');
const AppError = require('../../utils/AppError');
const { toMoney } = require('../../utils/money');
const { buildMeta } = require('../../utils/pagination');
const { generateOrderCode } = require('../../utils/orderCode');
const orderRepository = require('./order.repository');
const productSnapshotRepository = require('./productSnapshot.repository');
const promotionRepository = require('../promotions/promotion.repository');
const promotionService = require('../promotions/promotion.service');
const warehouseClient = require('../../clients/warehouse.client');
const orderEvents = require('../../events/orderEvents.publisher');
const { mintSystemAccessToken } = require('../../utils/systemToken');

// ---------------------------------------------------------------------------
// Máy trạng thái đơn hàng — chỉ những bước chuyển được liệt kê dưới đây mới hợp lệ.
// 'completed' và 'cancelled' là trạng thái cuối (terminal), không thể đổi tiếp.
//   pending_payment ─┬─> paid ─> processing ─> shipped ─> completed
//                    └─> cancelled (hủy trước khi thanh toán)
//   paid ─> cancelled (hoàn tiền/hủy sau khi đã thanh toán nhưng chưa giao)
// ---------------------------------------------------------------------------
const ALLOWED_TRANSITIONS = {
    pending_payment: ['paid', 'cancelled'],
    paid: ['processing', 'cancelled'],
    processing: ['shipped'],
    shipped: ['completed'],
    completed: [],
    cancelled: [],
};

function toPublicOrder(order, items) {
    return {
        id: order.id,
        orderCode: order.order_code,
        userId: order.user_id,
        status: order.status,
        subtotalAmount: Number(order.subtotal_amount),
        discountAmount: Number(order.discount_amount),
        shippingFee: Number(order.shipping_fee),
        totalAmount: Number(order.total_amount),
        promotionCode: order.promotion_code,
        recipient: {
            name: order.recipient_name,
            phone: order.recipient_phone,
            address: order.shipping_address,
        },
        note: order.note,
        items: items.map((item) => ({
            skuId: item.sku_id,
            skuCode: item.sku_code,
            productId: item.product_id,
            productName: item.product_name,
            price: Number(item.price),
            quantity: item.quantity,
            lineTotal: Number(item.line_total),
        })),
        createdAt: order.created_at,
        updatedAt: order.updated_at,
    };
}

async function buildOrderDetail(orderRow) {
    const items = await orderRepository.findItemsByOrderId(orderRow.id);
    return toPublicOrder(orderRow, items);
}

// ---------------------------------------------------------------------------
// Bù trừ (compensation) — khi một bước giữa chừng của checkout thất bại sau khi đã giữ chỗ
// thành công ở Warehouse Service cho 1 vài SKU, phải chủ động nhả lại NGAY các phần đã giữ
// để không "khóa nhầm" tồn kho của khách khác. Đây là kiểu xử lý Saga/compensating-transaction
// đơn giản cho giao tác phân tán (Order DB + Warehouse Service) — chạy "best-effort", chỉ log lỗi
// chứ không throw tiếp vì lỗi gốc mới là thứ cần trả về cho khách.
// ---------------------------------------------------------------------------
async function releaseAcquiredLocks(acquiredItems, orderCode, accessToken) {
    for (const item of acquiredItems) {
        try {
            await warehouseClient.releaseStock({ skuId: item.skuId, orderId: orderCode }, accessToken);
        } catch (err) {
            console.error(`[Checkout] Không thể tự nhả lock bù trừ cho skuId=${item.skuId}, orderCode=${orderCode}:`, err.message);
        }
    }
}

// ---------------------------------------------------------------------------
// POST /api/orders/checkout — điểm điều phối (orchestration) trung tâm của toàn hệ thống:
//   1) Tra giá/tên CHÍNH THỨC từ product_snapshots (đồng bộ qua Kafka, KHÔNG tin giá FE gửi lên)
//   2) Áp dụng khuyến mãi (nếu có) và tính tổng tiền cuối cùng
//   3) Giữ chỗ tồn kho cho từng SKU bằng cách gọi đồng bộ sang Warehouse Service — có bù trừ
//      (release) ngay nếu một SKU giữa chừng giữ chỗ thất bại
//   4) Ghi đơn hàng + tăng lượt dùng khuyến mãi trong 1 transaction nội bộ — nếu transaction
//      thất bại, nhả lại TOÀN BỘ các lock đã giữ ở bước 3
//   5) Phát sự kiện 'order.created' lên Kafka cho Payment/Shipping/Warehouse Service
// Toàn bộ phép tính (giá, giảm giá, phí ship, tổng tiền) đều nằm ở đây — đúng nguyên tắc
// "khép kín ở Backend", FE chỉ gửi skuId+quantity và nhận lại con số đã chốt để hiển thị.
// ---------------------------------------------------------------------------
async function checkout(user, payload, accessToken) {
    const { items, recipientName, recipientPhone, shippingAddress, promoCode, note } = payload;

    // 1) Tra snapshot giá/tên chính thức — từ chối ngay nếu thiếu hoặc sản phẩm không còn bán.
    const skuIds = [...new Set(items.map((item) => item.skuId))];
    const snapshots = await productSnapshotRepository.findManyBySkuIds(skuIds);
    const snapshotMap = new Map(snapshots.map((row) => [row.sku_id, row]));

    const orderItems = items.map((item) => {
        const snapshot = snapshotMap.get(item.skuId);
        if (!snapshot) {
            throw new AppError(404, `Không tìm thấy sản phẩm với skuId=${item.skuId}`);
        }
        if (snapshot.status !== 'active') {
            throw new AppError(409, `Sản phẩm "${snapshot.product_name}" hiện không thể đặt mua (đã ngừng kinh doanh hoặc chưa mở bán)`);
        }

        const price = toMoney(snapshot.price);
        return {
            skuId: item.skuId,
            skuCode: snapshot.sku_code,
            productId: snapshot.product_id,
            productName: snapshot.product_name,
            price,
            quantity: item.quantity,
            lineTotal: toMoney(price * item.quantity),
        };
    });

    const subtotalAmount = toMoney(orderItems.reduce((sum, item) => sum + item.lineTotal, 0));
    const shippingFee = env.defaultShippingFee;
    const orderCode = generateOrderCode();

    // 2) Giữ chỗ tồn kho — gọi tuần tự sang Warehouse Service, forward token gốc của khách.
    //    Tuần tự (không Promise.all) để khi 1 SKU thất bại giữa chừng, ta biết CHÍNH XÁC những
    //    SKU nào đã giữ thành công trước đó để nhả lại — tránh rò rỉ giữ chỗ "mồ côi".
    const acquiredLocks = [];
    try {
        for (const item of orderItems) {
            await warehouseClient.lockStock({ skuId: item.skuId, orderId: orderCode, quantity: item.quantity }, accessToken);
            acquiredLocks.push(item);
        }
    } catch (err) {
        await releaseAcquiredLocks(acquiredLocks, orderCode, accessToken);
        throw err;
    }

    // 3) + 4) Áp dụng khuyến mãi + ghi đơn trong 1 transaction nội bộ — khóa FOR UPDATE dòng
    //    promotion để chặn race condition vượt usage_limit khi nhiều đơn cùng dùng 1 mã.
    try {
        const orderId = await orderRepository.withTransaction(async (connection) => {
            let promotion = null;
            let discountAmount = 0;

            if (promoCode) {
                const result = await promotionService.lockAndValidateForCheckout(connection, promoCode, subtotalAmount);
                promotion = result.promotion;
                discountAmount = result.discountAmount;
            }

            const totalAmount = Math.max(0, toMoney(subtotalAmount - discountAmount + shippingFee));

            const insertedId = await orderRepository.insertOrder(connection, {
                orderCode,
                userId: user.id,
                status: 'pending_payment',
                subtotalAmount,
                discountAmount,
                shippingFee,
                totalAmount,
                promotionId: promotion?.id ?? null,
                promotionCode: promotion?.code ?? null,
                recipientName,
                recipientPhone,
                shippingAddress,
                note: note || null,
            });
            await orderRepository.insertOrderItems(connection, insertedId, orderItems);

            if (promotion) {
                await promotionRepository.incrementUsedCount(connection, promotion.id);
            }

            return insertedId;
        });

        const detail = await buildOrderDetail(await orderRepository.findById(orderId));
        await orderEvents.publishOrderCreated(detail);
        return detail;
    } catch (err) {
        await releaseAcquiredLocks(acquiredLocks, orderCode, accessToken);
        throw err;
    }
}

// ---------------------------------------------------------------------------
// GET /api/orders/me — lịch sử đơn hàng của chính khách, BE tự lọc theo trạng thái + phân trang.
// ---------------------------------------------------------------------------
async function listMyOrders(userId, query, pagination) {
    const filters = { userId, status: query.status };
    const [rows, totalItems] = await Promise.all([
        orderRepository.list(filters, pagination),
        orderRepository.count(filters),
    ]);

    const items = await Promise.all(rows.map(async (row) => {
        const orderItems = await orderRepository.findItemsByOrderId(row.id);
        return toPublicOrder(row, orderItems);
    }));

    return { items, meta: buildMeta(pagination.page, pagination.limit, totalItems) };
}

// ---------------------------------------------------------------------------
// GET /api/orders/me/:id — chi tiết 1 đơn, chỉ trả về nếu đúng là đơn của khách đang đăng nhập
// (chặn ở tầng truy vấn bằng `findByIdAndUser`, không lộ thông tin đơn của người khác qua việc đoán id).
// ---------------------------------------------------------------------------
async function getMyOrderDetail(userId, orderId) {
    const order = await orderRepository.findByIdAndUser(orderId, userId);
    if (!order) {
        throw new AppError(404, 'Không tìm thấy đơn hàng');
    }
    return buildOrderDetail(order);
}

// ---------------------------------------------------------------------------
// Quản trị (Admin) — xem toàn bộ đơn hàng trong hệ thống.
// ---------------------------------------------------------------------------
async function listOrdersAdmin(query, pagination) {
    const filters = { userId: query.userId, status: query.status };
    const [rows, totalItems] = await Promise.all([
        orderRepository.list(filters, pagination),
        orderRepository.count(filters),
    ]);

    const items = await Promise.all(rows.map(async (row) => {
        const orderItems = await orderRepository.findItemsByOrderId(row.id);
        return toPublicOrder(row, orderItems);
    }));

    return { items, meta: buildMeta(pagination.page, pagination.limit, totalItems) };
}

async function getOrderDetailAdmin(orderId) {
    const order = await orderRepository.findById(orderId);
    if (!order) {
        throw new AppError(404, 'Không tìm thấy đơn hàng');
    }
    return buildOrderDetail(order);
}

// ---------------------------------------------------------------------------
// Lõi dùng chung cho MỌI đường chuyển trạng thái đơn — dù do Admin bấm tay (PUT .../status)
// hay do hệ thống tự kích hoạt khi nhận sự kiện 'payment.succeeded' (markOrderPaidFromPayment).
// Gom về 1 chỗ để đảm bảo hai đường đi luôn áp dụng ĐÚNG MỘT máy trạng thái, ĐÚNG MỘT bộ hiệu ứng
// phụ trên Warehouse Service, và luôn phát 'order.status_changed' — tránh lệch pha giữa hai luồng.
//   - 'cancelled': nhả lại toàn bộ tồn kho đã giữ + hoàn lượt dùng khuyến mãi (nếu có)
//   - 'paid'     : trừ kho thật (deduct) — xác nhận đã thu được tiền nên giữ chỗ chuyển thành xuất kho thật
// ---------------------------------------------------------------------------
async function applyStatusTransition(order, items, nextStatus, accessToken) {
    const allowed = ALLOWED_TRANSITIONS[order.status] || [];
    if (!allowed.includes(nextStatus)) {
        throw new AppError(409, `Không thể chuyển trạng thái đơn từ "${order.status}" sang "${nextStatus}"`, {
            currentStatus: order.status,
            allowedNextStatuses: allowed,
        });
    }

    const previousStatus = order.status;

    if (nextStatus === 'cancelled') {
        for (const item of items) {
            try {
                await warehouseClient.releaseStock({ skuId: item.sku_id, orderId: order.order_code }, accessToken);
            } catch (err) {
                if (err.statusCode === 404) {
                    // Bình thường khi hủy đơn do QUÁ HẠN GIỮ CHỖ: Warehouse Service đã tự nhả lượt giữ
                    // chỗ này từ trước (xem markOrderCancelledFromPaymentTimeout) — không phải lỗi.
                    console.log(`[Order] Tồn kho của đơn ${order.order_code} (skuId=${item.sku_id}) đã được nhả từ trước (có thể do quá hạn giữ chỗ), bỏ qua`);
                } else {
                    console.error(`[Order] Không thể nhả tồn kho khi hủy đơn ${order.order_code} (skuId=${item.sku_id}):`, err.message);
                }
            }
        }
        if (order.promotion_id) {
            await orderRepository.withTransaction((connection) => promotionRepository.decrementUsedCount(connection, order.promotion_id));
        }
    }

    if (nextStatus === 'paid') {
        for (const item of items) {
            await warehouseClient.deductStock({ skuId: item.sku_id, orderId: order.order_code, quantity: item.quantity }, accessToken);
        }
    }

    await orderRepository.withTransaction((connection) => orderRepository.updateStatus(connection, order.id, nextStatus));

    const updated = await buildOrderDetail(await orderRepository.findById(order.id));
    await orderEvents.publishOrderStatusChanged(updated, previousStatus);
    return updated;
}

// ---------------------------------------------------------------------------
// PUT /api/admin/orders/:id/status — Admin chuyển trạng thái đơn theo đúng máy trạng thái ở trên
// (vd: processing → shipped → completed, hoặc hủy đơn thủ công theo yêu cầu khách).
// ---------------------------------------------------------------------------
async function updateOrderStatusByAdmin(orderId, nextStatus, accessToken) {
    const order = await orderRepository.findById(orderId);
    if (!order) {
        throw new AppError(404, 'Không tìm thấy đơn hàng');
    }

    const items = await orderRepository.findItemsByOrderId(orderId);
    return applyStatusTransition(order, items, nextStatus, accessToken);
}

// ---------------------------------------------------------------------------
// Lõi dùng chung cho MỌI đường chuyển trạng thái đơn KÍCH HOẠT TỰ ĐỘNG bởi sự kiện Kafka từ
// các service khác (Payment khi thanh toán xong, Shipping khi lấy hàng/giao thành công...) —
// xem markOrderPaidFromPayment / markOrderShippedFromShipping / markOrderCompletedFromShipping.
//
// Không có request HTTP nào đi kèm sự kiện Kafka nên không có access token của khách để forward
// sang Warehouse Service — phải tự ký một "token hệ thống" bằng chung secret (xem utils/systemToken.js).
//
// Bỏ qua (không throw, chỉ log) nếu không tìm thấy đơn hoặc đơn không còn ở đúng trạng thái kỳ
// vọng: Kafka có thể gửi lại message (consumer restart, rebalance...) — xử lý lại một sự kiện đã
// áp dụng rồi sẽ gây hiệu ứng phụ trùng lặp (trừ kho 2 lần, phát sự kiện 2 lần...).
// ---------------------------------------------------------------------------
async function autoAdvanceOrderStatus({ orderCode, expectedStatus, nextStatus, sourceLabel }) {
    const order = await orderRepository.findByOrderCode(orderCode);
    if (!order) {
        console.error(`[${sourceLabel}] Không tìm thấy đơn hàng với mã ${orderCode} để tự động chuyển sang "${nextStatus}"`);
        return;
    }
    if (order.status !== expectedStatus) {
        console.warn(`[${sourceLabel}] Bỏ qua — đơn ${orderCode} hiện ở trạng thái "${order.status}" (không phải "${expectedStatus}"), có thể message Kafka đã được gửi lại`);
        return;
    }

    const items = await orderRepository.findItemsByOrderId(order.id);
    const accessToken = mintSystemAccessToken();
    await applyStatusTransition(order, items, nextStatus, accessToken);
    console.log(`[${sourceLabel}] Đơn hàng ${orderCode} đã tự động chuyển sang "${nextStatus}"`);
}

// Kích hoạt bởi sự kiện Kafka 'payment.succeeded' từ Payment Service (xem
// events/paymentEvents.consumer.js) — chuyển đơn 'pending_payment' → 'paid' ngay khi VNPay xác
// nhận đã thu tiền qua IPN, KHÔNG cần Admin can thiệp thủ công nữa.
async function markOrderPaidFromPayment(orderCode) {
    return autoAdvanceOrderStatus({ orderCode, expectedStatus: 'pending_payment', nextStatus: 'paid', sourceLabel: 'Payment' });
}

// Kích hoạt bởi sự kiện Kafka 'shipment.status_changed' (status='picked_up') từ Shipping Service
// (xem events/shippingEvents.consumer.js) — chuyển đơn 'processing' → 'shipped' ngay khi đơn vị
// vận chuyển xác nhận đã lấy hàng.
async function markOrderShippedFromShipping(orderCode) {
    return autoAdvanceOrderStatus({ orderCode, expectedStatus: 'processing', nextStatus: 'shipped', sourceLabel: 'Shipping' });
}

// Kích hoạt bởi sự kiện Kafka 'shipment.status_changed' (status='delivered') từ Shipping Service
// — chuyển đơn 'shipped' → 'completed' ngay khi giao hàng thành công tới khách, hoàn tất vòng đời đơn.
async function markOrderCompletedFromShipping(orderCode) {
    return autoAdvanceOrderStatus({ orderCode, expectedStatus: 'shipped', nextStatus: 'completed', sourceLabel: 'Shipping' });
}

// Kích hoạt bởi sự kiện Kafka 'stock.lock_expired' từ Warehouse Service (xem
// events/warehouseEvents.consumer.js) — khi lượt giữ chỗ tồn kho của đơn quá hạn (mặc định 15
// phút) mà khách vẫn chưa thanh toán, Warehouse Service tự nhả chỗ rồi báo lại để Order Service
// HỦY LUÔN đơn hàng tương ứng. Nhờ vậy đơn 'pending_payment' không còn "treo" vô thời hạn, và
// khách không thể bấm "Thanh toán lại" cho một đơn mà tồn kho đã được trả về cho người khác mua
// (tránh bán vượt tồn kho — oversell). Khách muốn mua tiếp thì phải tạo đơn mới, được kiểm tra
// và giữ chỗ tồn kho lại từ đầu.
async function markOrderCancelledFromPaymentTimeout(orderCode) {
    return autoAdvanceOrderStatus({ orderCode, expectedStatus: 'pending_payment', nextStatus: 'cancelled', sourceLabel: 'StockLock' });
}

module.exports = {
    checkout,
    listMyOrders,
    getMyOrderDetail,
    listOrdersAdmin,
    getOrderDetailAdmin,
    updateOrderStatusByAdmin,
    markOrderPaidFromPayment,
    markOrderShippedFromShipping,
    markOrderCompletedFromShipping,
    markOrderCancelledFromPaymentTimeout,
};
