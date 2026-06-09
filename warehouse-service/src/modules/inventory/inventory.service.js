const db = require('../../config/db');
const env = require('../../config/env');
const AppError = require('../../utils/AppError');
const { buildMeta } = require('../../utils/pagination');
const inventoryRepository = require('./inventory.repository');
const warehouseEvents = require('../../events/warehouseEvents.publisher');

function toPublicInventory(row) {
    return {
        skuId: row.sku_id,
        skuCode: row.sku_code,
        productId: row.product_id,
        quantityOnHand: row.quantity_on_hand,
        quantityAvailable: row.quantity_available,
        status: row.status,
    };
}

function toPublicLog(row) {
    return {
        id: row.id,
        skuId: row.sku_id,
        changeType: row.change_type,
        quantityChange: row.quantity_change,
        quantityOnHandAfter: row.quantity_on_hand_after,
        quantityAvailableAfter: row.quantity_available_after,
        referenceId: row.reference_id,
        note: row.note,
        createdAt: row.created_at,
    };
}

// Chạy 1 thao tác trong transaction — gói gọn begin/commit/rollback/release để các hàm nghiệp vụ
// bên dưới chỉ cần tập trung vào logic, không lặp lại boilerplate quản lý connection.
async function withTransaction(work) {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const result = await work(connection);
        await connection.commit();
        return result;
    } catch (err) {
        await connection.rollback();
        throw err;
    } finally {
        connection.release();
    }
}

async function getInventoryBySkuId(skuId) {
    const inventory = await inventoryRepository.findBySkuId(skuId);
    if (!inventory) {
        throw new AppError(404, 'Không tìm thấy thông tin tồn kho cho SKU này');
    }
    return toPublicInventory(inventory);
}

// ---------------------------------------------------------------------------
// Giữ chỗ khi khách đặt hàng — trừ tạm vào quantity_available và tạo lock có hạn 15 phút.
// Toàn bộ chạy trong 1 transaction với SELECT ... FOR UPDATE để chặn race condition khi
// nhiều đơn cùng tranh mua 1 SKU sắp hết hàng.
// ---------------------------------------------------------------------------
async function lockStock({ skuId, orderId, quantity }) {
    return withTransaction(async (connection) => {
        const inventory = await inventoryRepository.findBySkuIdForUpdate(connection, skuId);
        if (!inventory) {
            throw new AppError(404, 'Không tìm thấy thông tin tồn kho cho SKU này');
        }
        if (inventory.status === 'discontinued') {
            throw new AppError(409, 'Sản phẩm đã ngừng kinh doanh, không thể đặt hàng');
        }
        if (inventory.quantity_available < quantity) {
            throw new AppError(409, 'Số lượng khả dụng không đủ để giữ chỗ', {
                requested: quantity,
                available: inventory.quantity_available,
            });
        }

        const quantityAvailableAfter = inventory.quantity_available - quantity;
        await inventoryRepository.updateQuantities(connection, skuId, {
            quantityOnHand: inventory.quantity_on_hand,
            quantityAvailable: quantityAvailableAfter,
        });

        const expiresAt = new Date(Date.now() + env.stockLockTtlMinutes * 60 * 1000);
        const lockId = await inventoryRepository.createLock(connection, { skuId, orderId, quantity, expiresAt });

        await inventoryRepository.insertStockLog(connection, {
            skuId,
            changeType: 'lock',
            quantityChange: -quantity,
            quantityOnHandAfter: inventory.quantity_on_hand,
            quantityAvailableAfter,
            referenceId: orderId,
            note: `Giữ chỗ ${env.stockLockTtlMinutes} phút khi đặt hàng`,
        });

        return {
            lockId,
            skuId,
            orderId,
            quantity,
            expiresAt,
            quantityAvailable: quantityAvailableAfter,
        };
    });
}

// ---------------------------------------------------------------------------
// Nhả chỗ — dùng khi đơn bị hủy/timeout thanh toán. Hoàn lại đúng số lượng đã giữ vào quantity_available.
// ---------------------------------------------------------------------------
async function releaseStock({ skuId, orderId }) {
    return withTransaction(async (connection) => {
        const lock = await inventoryRepository.findActiveLock(connection, skuId, orderId);
        if (!lock) {
            throw new AppError(404, 'Không tìm thấy lượt giữ chỗ đang hoạt động cho đơn hàng này');
        }

        const inventory = await inventoryRepository.findBySkuIdForUpdate(connection, skuId);
        const quantityAvailableAfter = inventory.quantity_available + lock.quantity;

        await inventoryRepository.updateQuantities(connection, skuId, {
            quantityOnHand: inventory.quantity_on_hand,
            quantityAvailable: quantityAvailableAfter,
        });
        await inventoryRepository.updateLockStatus(connection, lock.id, 'released');
        await inventoryRepository.insertStockLog(connection, {
            skuId,
            changeType: 'release',
            quantityChange: lock.quantity,
            quantityOnHandAfter: inventory.quantity_on_hand,
            quantityAvailableAfter,
            referenceId: orderId,
            note: 'Nhả chỗ do đơn hàng bị hủy',
        });

        return { skuId, orderId, releasedQuantity: lock.quantity, quantityAvailable: quantityAvailableAfter };
    });
}

// ---------------------------------------------------------------------------
// Trừ kho thật khi đã nhận được tiền — trừ thẳng vào quantity_on_hand.
// Nếu tìm thấy lock tương ứng (đường đi chuẩn: lock → deduct) thì quantity_available GIỮ NGUYÊN
// vì đã được trừ tạm từ lúc lock; chỉ trừ thêm vào available khi deduct "tay" không qua lock
// (trường hợp hiếm — ví dụ admin trừ thủ công) để tổng số liệu luôn nhất quán.
// ---------------------------------------------------------------------------
async function deductStock({ skuId, orderId, quantity }) {
    return withTransaction(async (connection) => {
        const inventory = await inventoryRepository.findBySkuIdForUpdate(connection, skuId);
        if (!inventory) {
            throw new AppError(404, 'Không tìm thấy thông tin tồn kho cho SKU này');
        }

        const quantityOnHandAfter = inventory.quantity_on_hand - quantity;
        if (quantityOnHandAfter < 0) {
            throw new AppError(409, 'Số lượng trừ vượt quá tồn kho thực tế', {
                requested: quantity,
                onHand: inventory.quantity_on_hand,
            });
        }

        const lock = await inventoryRepository.findActiveLock(connection, skuId, orderId);
        const quantityAvailableAfter = lock
            ? inventory.quantity_available
            : Math.max(0, inventory.quantity_available - quantity);

        await inventoryRepository.updateQuantities(connection, skuId, {
            quantityOnHand: quantityOnHandAfter,
            quantityAvailable: quantityAvailableAfter,
        });
        if (lock) {
            await inventoryRepository.updateLockStatus(connection, lock.id, 'consumed');
        }
        await inventoryRepository.insertStockLog(connection, {
            skuId,
            changeType: 'deduct',
            quantityChange: -quantity,
            quantityOnHandAfter,
            quantityAvailableAfter,
            referenceId: orderId,
            note: 'Trừ kho khi xác nhận thanh toán thành công',
        });

        return { skuId, orderId, quantityOnHand: quantityOnHandAfter, quantityAvailable: quantityAvailableAfter };
    });
}

// ---------------------------------------------------------------------------
// Điều chỉnh tồn kho thủ công (Admin) — nhập hàng (+), kiểm kê hao hụt (-)...
// Cộng/trừ đều đặn vào cả hai cột vì đây là thay đổi ở "nguồn" (chưa có đơn nào giữ chỗ phần chênh lệch).
// ---------------------------------------------------------------------------
async function adjustStock({ skuId, quantityChange, note }) {
    return withTransaction(async (connection) => {
        const inventory = await inventoryRepository.findBySkuIdForUpdate(connection, skuId);
        if (!inventory) {
            throw new AppError(404, 'Không tìm thấy thông tin tồn kho cho SKU này');
        }

        const quantityOnHandAfter = inventory.quantity_on_hand + quantityChange;
        const quantityAvailableAfter = inventory.quantity_available + quantityChange;
        if (quantityOnHandAfter < 0 || quantityAvailableAfter < 0) {
            throw new AppError(409, 'Số lượng sau điều chỉnh không thể âm', {
                quantityChange,
                onHand: inventory.quantity_on_hand,
                available: inventory.quantity_available,
            });
        }

        await inventoryRepository.updateQuantities(connection, skuId, {
            quantityOnHand: quantityOnHandAfter,
            quantityAvailable: quantityAvailableAfter,
        });
        await inventoryRepository.insertStockLog(connection, {
            skuId,
            changeType: quantityChange >= 0 ? 'import' : 'adjustment',
            quantityChange,
            quantityOnHandAfter,
            quantityAvailableAfter,
            referenceId: null,
            note: note || (quantityChange >= 0 ? 'Nhập thêm hàng' : 'Điều chỉnh giảm sau kiểm kê'),
        });

        return toPublicInventory({ ...inventory, quantity_on_hand: quantityOnHandAfter, quantity_available: quantityAvailableAfter });
    });
}

// ---------------------------------------------------------------------------
// Tự động nhả các lượt giữ chỗ đã quá hạn 15 phút mà đơn vẫn chưa thanh toán —
// chạy định kỳ từ background job khai báo ở server.js, KHÔNG phải API cho FE gọi.
// ---------------------------------------------------------------------------
async function releaseExpiredLocks() {
    const expiredLocks = await inventoryRepository.findExpiredHoldingLocks(100);
    let releasedCount = 0;

    for (const lock of expiredLocks) {
        try {
            await withTransaction(async (connection) => {
                const inventory = await inventoryRepository.findBySkuIdForUpdate(connection, lock.sku_id);
                if (!inventory) return;

                const quantityAvailableAfter = inventory.quantity_available + lock.quantity;
                await inventoryRepository.updateQuantities(connection, lock.sku_id, {
                    quantityOnHand: inventory.quantity_on_hand,
                    quantityAvailable: quantityAvailableAfter,
                });
                await inventoryRepository.updateLockStatus(connection, lock.id, 'expired');
                await inventoryRepository.insertStockLog(connection, {
                    skuId: lock.sku_id,
                    changeType: 'release',
                    quantityChange: lock.quantity,
                    quantityOnHandAfter: inventory.quantity_on_hand,
                    quantityAvailableAfter,
                    referenceId: lock.order_id,
                    note: `Tự động nhả chỗ do quá hạn ${env.stockLockTtlMinutes} phút chưa thanh toán`,
                });
            });
            releasedCount += 1;

            // Báo cho Order Service biết để HỦY LUÔN đơn hàng tương ứng — nếu không, đơn vẫn
            // "treo" ở 'pending_payment' dù tồn kho đã được trả lại cho người khác mua, dẫn tới
            // rủi ro khách bấm "Thanh toán lại" và trả tiền cho một đơn không còn hàng để giao.
            try {
                await warehouseEvents.publishStockLockExpired({
                    orderCode: lock.order_id,
                    skuId: lock.sku_id,
                    quantity: lock.quantity,
                });
            } catch (err) {
                console.error(`[StockLock] Không thể phát sự kiện 'stock.lock_expired' cho đơn ${lock.order_id} (sku_id=${lock.sku_id}):`, err.message);
            }
        } catch (err) {
            console.error(`[StockLock] Không thể tự nhả lock #${lock.id} (sku_id=${lock.sku_id}):`, err.message);
        }
    }

    return releasedCount;
}

// ---------------------------------------------------------------------------
// Lịch sử biến động kho — BE gom lọc theo SKU/loại/khoảng ngày + phân trang trước khi trả JSON.
// ---------------------------------------------------------------------------
async function listStockLogs(query, pagination) {
    const filters = {
        skuId: query.skuId,
        changeType: query.changeType,
        fromDate: query.fromDate,
        toDate: query.toDate,
    };

    const [items, totalItems] = await Promise.all([
        inventoryRepository.listLogs(filters, pagination),
        inventoryRepository.countLogs(filters),
    ]);

    return { items: items.map(toPublicLog), meta: buildMeta(pagination.page, pagination.limit, totalItems) };
}

// ---------------------------------------------------------------------------
// Đồng bộ dữ liệu từ sự kiện Kafka 'product-events' do Product Service phát ra.
// ---------------------------------------------------------------------------
async function syncFromProductEvent(envelope) {
    const { eventType, data } = envelope;

    switch (eventType) {
        case 'product.created':
        case 'product.updated':
            for (const variant of data.variants) {
                await inventoryRepository.upsertFromProductSync({
                    skuId: variant.skuId,
                    skuCode: variant.skuCode,
                    productId: data.productId,
                });
            }
            console.log(`[Sync] Đã đồng bộ ${data.variants.length} SKU từ sự kiện ${eventType} (productId=${data.productId})`);
            break;

        case 'product.deleted':
            await inventoryRepository.markDiscontinued(data.skuIds);
            console.log(`[Sync] Đã đánh dấu ngừng kinh doanh ${data.skuIds.length} SKU từ sự kiện ${eventType} (productId=${data.productId})`);
            break;

        default:
            console.warn(`[Sync] Bỏ qua eventType không xác định: ${eventType}`);
    }
}

module.exports = {
    getInventoryBySkuId,
    lockStock,
    releaseStock,
    deductStock,
    adjustStock,
    releaseExpiredLocks,
    listStockLogs,
    syncFromProductEvent,
};
