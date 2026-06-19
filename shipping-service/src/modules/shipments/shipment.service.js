const AppError = require('../../utils/AppError');
const { toMoney } = require('../../utils/money');
const { buildMeta } = require('../../utils/pagination');
const shipmentRepository = require('./shipment.repository');
const orderSnapshotRepository = require('./orderSnapshot.repository');
const { calculateFee } = require('../../utils/shippingFee');
const { createLabel } = require('../../utils/carrier');
const shippingEvents = require('../../events/shippingEvents.publisher');
const redis = require('../../config/redis');

// Cache kết quả "xem trước phí vận chuyển" — phép tính THUẦN TÚY và XÁC ĐỊNH (cùng địa chỉ +
// cân nặng luôn cho ra cùng 1 kết quả, xem utils/shippingFee.js), nhưng ở trang thanh toán khách
// thường đổi/so sánh qua lại vài địa chỉ giao hàng nhiều lần trước khi chốt đơn. Cache ngắn hạn
// giúp những lượt bấm lặp lại không phải tính lại từ đầu. Không cần cơ chế invalidate vì công thức
// tính phí chỉ đổi khi sửa cấu hình hệ thống (hiếm, cần restart service) — TTL ngắn là đủ.
const FEE_PREVIEW_CACHE_TTL_SECONDS = 5 * 60;

function feePreviewCacheKey({ address, weightKg }) {
    const normalizedAddress = String(address || '').trim().toLowerCase().replace(/\s+/g, ' ');
    return `shipping:fee_preview:${normalizedAddress}:${weightKg}`;
}

// Cân nặng KHÔNG có sẵn trong dữ liệu đơn hàng (Order Service không lưu cân nặng từng SKU) nên
// Shipping Service tự ước lượng theo số lượng sản phẩm trong đơn — mock hợp lý mà không đòi hỏi
// đổi schema của service khác. MIN_WEIGHT_KG đảm bảo đơn 1 món nhỏ vẫn có phí tối thiểu hợp lý.
const DEFAULT_WEIGHT_PER_ITEM_KG = 0.3;
const MIN_WEIGHT_KG = 0.5;

// ---------------------------------------------------------------------------
// Máy trạng thái vận đơn — chỉ những bước chuyển liệt kê dưới đây mới hợp lệ.
// 'delivered' và 'returned' là trạng thái cuối (terminal).
//   pending ─> picked_up ─> in_transit ─> delivered
//      └────────┴─────────────┴──────────> failed ─> returned
// ---------------------------------------------------------------------------
const ALLOWED_TRANSITIONS = {
    pending: ['picked_up', 'failed'],
    picked_up: ['in_transit', 'failed'],
    in_transit: ['delivered', 'failed'],
    delivered: [],
    failed: ['returned'],
    returned: [],
};

function estimateWeightKg(itemCount) {
    const raw = Math.max(MIN_WEIGHT_KG, itemCount * DEFAULT_WEIGHT_PER_ITEM_KG);
    return Math.round(raw * 100) / 100;
}

function toPublicShipment(shipment, logs = []) {
    return {
        id: shipment.id,
        orderId: shipment.order_id,
        orderCode: shipment.order_code,
        userId: shipment.user_id,
        carrier: shipment.carrier,
        trackingCode: shipment.tracking_code,
        recipient: {
            name: shipment.recipient_name,
            phone: shipment.recipient_phone,
            address: shipment.shipping_address,
        },
        weightKg: Number(shipment.weight_kg),
        fee: Number(shipment.fee),
        status: shipment.status,
        shippedAt: shipment.shipped_at,
        deliveredAt: shipment.delivered_at,
        history: logs.map((log) => ({ status: log.status, note: log.note, occurredAt: log.created_at })),
        createdAt: shipment.created_at,
        updatedAt: shipment.updated_at,
    };
}

async function buildShipmentDetail(shipmentRow) {
    const logs = await shipmentRepository.findLogsByShipmentId(shipmentRow.id);
    return toPublicShipment(shipmentRow, logs);
}

// ---------------------------------------------------------------------------
// POST /api/shipping/calculate-fee — xem trước phí vận chuyển, KHÔNG gắn với đơn hàng cụ thể.
// FE gọi để hiển thị ước tính cho khách (vd: ở trang giỏ hàng, nhập địa chỉ xem phí ship trước
// khi đặt). Dùng ĐÚNG công thức mà Shipping Service áp dụng khi tự tạo vận đơn thật, để con số
// xem trước khớp với con số phát sinh thực tế sau này — không có 2 nguồn tính phí khác nhau.
// ---------------------------------------------------------------------------
async function previewFee({ address, weightKg }) {
    const cacheKey = feePreviewCacheKey({ address, weightKg });

    const cached = await redis.client.get(cacheKey);
    if (cached) {
        console.log(`[Cache][Redis] Lấy kết quả ước tính phí vận chuyển TỪ REDIS — không tính lại (key=${cacheKey})`);
        return JSON.parse(cached);
    }

    const { fee, zone, baseFee, weightSurcharge, zoneSurcharge } = calculateFee({ address, weightKg });
    const result = { fee: toMoney(fee), zone, baseFee, weightSurcharge, zoneSurcharge, weightKg };

    console.log(`[Cache][Tính toán] Cache chưa có/đã hết hạn — tính phí vận chuyển trực tiếp rồi lưu vào Redis (key=${cacheKey}, TTL=${FEE_PREVIEW_CACHE_TTL_SECONDS}s)`);
    await redis.client.set(cacheKey, JSON.stringify(result), 'EX', FEE_PREVIEW_CACHE_TTL_SECONDS);

    return result;
}

// ---------------------------------------------------------------------------
// Tự động tạo vận đơn khi Order Service báo đơn đã chuyển sang 'processing' (đã thanh toán,
// đang đóng gói — đúng thời điểm giao cho đơn vị vận chuyển). Đây là đường đi CHUẨN, kích hoạt
// hoàn toàn tự động qua sự kiện Kafka, không cần Admin tạo tay (xem orderSnapshot.service.js).
//
// Phòng thủ trùng lặp: nếu đơn này đã có vận đơn rồi (Kafka gửi lại sự kiện do consumer
// restart/rebalance) thì bỏ qua — tạo đôi sẽ khiến khách nhận 2 mã vận đơn cho cùng 1 đơn hàng.
// ---------------------------------------------------------------------------
async function createShipmentForOrder(orderCode) {
    const existing = await shipmentRepository.findByOrderCode(orderCode);
    if (existing) {
        console.warn(`[Shipping] Bỏ qua — đơn ${orderCode} đã có vận đơn (có thể message Kafka đã được gửi lại)`);
        return buildShipmentDetail(existing);
    }

    const snapshot = await orderSnapshotRepository.findByOrderCode(orderCode);
    if (!snapshot) {
        console.error(`[Shipping] Không tìm thấy bản sao đơn hàng ${orderCode} để tạo vận đơn`);
        return null;
    }

    const weightKg = estimateWeightKg(snapshot.item_count);
    const { fee, zone } = calculateFee({ address: snapshot.shipping_address, weightKg });
    const { carrier, trackingCode } = createLabel({ orderCode, zone });

    const shipmentId = await shipmentRepository.withTransaction(async (connection) => {
        const insertedId = await shipmentRepository.insertShipment(connection, {
            orderId: snapshot.order_id,
            orderCode: snapshot.order_code,
            userId: snapshot.user_id,
            carrier,
            trackingCode,
            recipientName: snapshot.recipient_name,
            recipientPhone: snapshot.recipient_phone,
            shippingAddress: snapshot.shipping_address,
            weightKg,
            fee: toMoney(fee),
            status: 'pending',
        });
        await shipmentRepository.insertStatusLog(connection, insertedId, 'pending', 'Đã tạo vận đơn, chờ đơn vị vận chuyển lấy hàng');
        return insertedId;
    });

    const shipment = await shipmentRepository.findById(shipmentId);
    await shippingEvents.publishShipmentCreated({
        id: shipment.id,
        orderId: shipment.order_id,
        orderCode: shipment.order_code,
        userId: shipment.user_id,
        carrier: shipment.carrier,
        trackingCode: shipment.tracking_code,
        fee: Number(shipment.fee),
        status: shipment.status,
    });
    console.log(`[Shipping] Đã tạo vận đơn ${trackingCode} (${carrier}) cho đơn ${orderCode} — phí ${toMoney(fee)}đ, ước tính ${weightKg}kg`);
    return buildShipmentDetail(shipment);
}

// ---------------------------------------------------------------------------
// GET /api/shipping/me — lịch sử vận đơn của chính khách (mỗi đơn hàng có tối đa 1 vận đơn).
// ---------------------------------------------------------------------------
async function listMyShipments(userId, query, pagination) {
    const filters = { userId, status: query.status };
    const [rows, totalItems] = await Promise.all([
        shipmentRepository.list(filters, pagination),
        shipmentRepository.count(filters),
    ]);
    const items = await Promise.all(rows.map((row) => buildShipmentDetail(row)));
    return { items, meta: buildMeta(pagination.page, pagination.limit, totalItems) };
}

// ---------------------------------------------------------------------------
// GET /api/shipping/me/:orderCode — tra cứu vận đơn + lịch sử trạng thái (tracking) của 1 đơn,
// chỉ trả về nếu đúng là đơn của khách đang đăng nhập.
// ---------------------------------------------------------------------------
async function getMyShipmentDetail(userId, orderCode) {
    const shipment = await shipmentRepository.findByOrderCodeAndUser(orderCode, userId);
    if (!shipment) {
        throw new AppError(404, 'Không tìm thấy vận đơn cho đơn hàng này');
    }
    return buildShipmentDetail(shipment);
}

// ---------------------------------------------------------------------------
// Quản trị (Admin) — xem toàn bộ vận đơn trong hệ thống, lọc theo trạng thái/hãng/đơn/khách.
// ---------------------------------------------------------------------------
async function listShipmentsAdmin(query, pagination) {
    const filters = { userId: query.userId, status: query.status, orderCode: query.orderCode, carrier: query.carrier };
    const [rows, totalItems] = await Promise.all([
        shipmentRepository.list(filters, pagination),
        shipmentRepository.count(filters),
    ]);
    const items = await Promise.all(rows.map((row) => buildShipmentDetail(row)));
    return { items, meta: buildMeta(pagination.page, pagination.limit, totalItems) };
}

async function getShipmentDetailAdmin(shipmentId) {
    const shipment = await shipmentRepository.findById(shipmentId);
    if (!shipment) {
        throw new AppError(404, 'Không tìm thấy vận đơn');
    }
    return buildShipmentDetail(shipment);
}

// ---------------------------------------------------------------------------
// PUT /api/admin/shipments/:id/status — Admin đẩy vận đơn đi tiếp theo máy trạng thái.
// Đây là MOCK cho webhook mà 1 đơn vị vận chuyển thật (GHTK/GHN) sẽ tự động gọi về hệ thống mỗi
// khi trạng thái đơn thay đổi — vì chưa có tích hợp thật, Admin đóng vai trò "giả lập" bước này.
//
// Khóa FOR UPDATE dòng vận đơn để chặn 2 request cập nhật đồng thời đẩy vận đơn qua 2 trạng thái
// khác nhau dựa trên cùng 1 bản ghi cũ — cùng nguyên tắc Order Service áp dụng khi đổi trạng thái đơn.
// ---------------------------------------------------------------------------
async function updateShipmentStatusAdmin(shipmentId, nextStatus, note) {
    const { previousStatus } = await shipmentRepository.withTransaction(async (connection) => {
        const shipment = await shipmentRepository.findByIdForUpdate(connection, shipmentId);
        if (!shipment) {
            throw new AppError(404, 'Không tìm thấy vận đơn');
        }

        const allowed = ALLOWED_TRANSITIONS[shipment.status] || [];
        if (!allowed.includes(nextStatus)) {
            throw new AppError(409, `Không thể chuyển trạng thái vận đơn từ "${shipment.status}" sang "${nextStatus}"`, {
                currentStatus: shipment.status,
                allowedNextStatuses: allowed,
            });
        }

        const now = new Date();
        await shipmentRepository.updateStatus(connection, shipmentId, nextStatus, {
            shippedAt: nextStatus === 'picked_up' ? now : null,
            deliveredAt: nextStatus === 'delivered' ? now : null,
        });
        await shipmentRepository.insertStatusLog(connection, shipmentId, nextStatus, note);

        return { previousStatus: shipment.status };
    });

    const shipment = await shipmentRepository.findById(shipmentId);
    await shippingEvents.publishShipmentStatusChanged({
        id: shipment.id,
        orderId: shipment.order_id,
        orderCode: shipment.order_code,
        userId: shipment.user_id,
        carrier: shipment.carrier,
        trackingCode: shipment.tracking_code,
        status: shipment.status,
    }, previousStatus);

    console.log(`[Shipping] Vận đơn ${shipment.tracking_code} (đơn ${shipment.order_code}): ${previousStatus} → ${shipment.status}`);
    return buildShipmentDetail(shipment);
}

module.exports = {
    previewFee,
    createShipmentForOrder,
    listMyShipments,
    getMyShipmentDetail,
    listShipmentsAdmin,
    getShipmentDetailAdmin,
    updateShipmentStatusAdmin,
};
