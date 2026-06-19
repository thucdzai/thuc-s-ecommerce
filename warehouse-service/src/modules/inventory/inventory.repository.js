const db = require('../../config/db');

// ---------------------------------------------------------------------------
// Đọc dữ liệu
// ---------------------------------------------------------------------------

async function findBySkuId(skuId) {
    const [rows] = await db.execute('SELECT * FROM inventory WHERE sku_id = ? LIMIT 1', [skuId]);
    return rows[0] || null;
}

// SELECT ... FOR UPDATE bên trong transaction — khóa đúng dòng inventory của SKU này lại,
// đảm bảo 2 request lock/deduct cùng lúc cho cùng 1 SKU không bao giờ đọc thấy số liệu cũ của nhau
// (tránh race condition kinh điển "bán lố hàng" khi nhiều khách cùng đặt 1 sản phẩm sắp hết).
async function findBySkuIdForUpdate(connection, skuId) {
    const [rows] = await connection.execute('SELECT * FROM inventory WHERE sku_id = ? FOR UPDATE', [skuId]);
    return rows[0] || null;
}

async function findActiveLock(connection, skuId, orderId) {
    const [rows] = await connection.execute(
        `SELECT * FROM stock_locks WHERE sku_id = ? AND order_id = ? AND status = 'holding' LIMIT 1`,
        [skuId, orderId]
    );
    return rows[0] || null;
}

async function findExpiredHoldingLocks(limit = 100) {
    const [rows] = await db.query(
        `SELECT * FROM stock_locks WHERE status = 'holding' AND expires_at <= NOW() LIMIT ${Number(limit)}`
    );
    return rows;
}

// ---------------------------------------------------------------------------
// Ghi dữ liệu — mọi thao tác đổi số lượng đều chạy trong transaction do service điều phối,
// repository chỉ chịu trách nhiệm thực thi câu lệnh, không tự mở/đóng transaction.
// ---------------------------------------------------------------------------

async function updateQuantities(connection, skuId, { quantityOnHand, quantityAvailable }) {
    await connection.execute(
        'UPDATE inventory SET quantity_on_hand = ?, quantity_available = ? WHERE sku_id = ?',
        [quantityOnHand, quantityAvailable, skuId]
    );
}

async function createLock(connection, { skuId, orderId, quantity, expiresAt }) {
    const [result] = await connection.execute(
        `INSERT INTO stock_locks (sku_id, order_id, quantity, status, expires_at) VALUES (?, ?, ?, 'holding', ?)`,
        [skuId, orderId, quantity, expiresAt]
    );
    return result.insertId;
}

async function updateLockStatus(connection, lockId, status) {
    await connection.execute('UPDATE stock_locks SET status = ? WHERE id = ?', [status, lockId]);
}

async function insertStockLog(connection, {
    skuId, changeType, quantityChange, quantityOnHandAfter, quantityAvailableAfter, referenceId, note,
}) {
    await connection.execute(
        `INSERT INTO stock_logs
            (sku_id, change_type, quantity_change, quantity_on_hand_after, quantity_available_after, reference_id, note)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [skuId, changeType, quantityChange, quantityOnHandAfter, quantityAvailableAfter, referenceId || null, note || null]
    );
}

// ---------------------------------------------------------------------------
// Lịch sử kho — BE tự lọc theo SKU/loại biến động/khoảng ngày và phân trang trước khi trả JSON.
// ---------------------------------------------------------------------------

function buildLogFilter({ skuId, changeType, fromDate, toDate }) {
    const conditions = ['1 = 1'];
    const params = [];

    if (skuId) {
        conditions.push('sku_id = ?');
        params.push(skuId);
    }
    if (changeType) {
        conditions.push('change_type = ?');
        params.push(changeType);
    }
    if (fromDate) {
        conditions.push('created_at >= ?');
        params.push(fromDate);
    }
    if (toDate) {
        conditions.push('created_at <= ?');
        params.push(toDate);
    }

    return { whereClause: `WHERE ${conditions.join(' AND ')}`, params };
}

async function countLogs(filters) {
    const { whereClause, params } = buildLogFilter(filters);
    const [rows] = await db.query(`SELECT COUNT(*) AS total FROM stock_logs ${whereClause}`, params);
    return rows[0].total;
}

async function listLogs(filters, { limit, offset }) {
    const { whereClause, params } = buildLogFilter(filters);
    // limit/offset đã được parsePagination() ép kiểu integer — an toàn để nội suy trực tiếp vào LIMIT/OFFSET
    // (mysql2 prepared statements không hỗ trợ tốt placeholder ở mệnh đề LIMIT).
    const [rows] = await db.query(
        `SELECT * FROM stock_logs ${whereClause} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`,
        params
    );
    return rows;
}

// ---------------------------------------------------------------------------
// Đồng bộ từ sự kiện Kafka của Product Service
// ---------------------------------------------------------------------------

// "Upsert by sku_id": SKU mới → tạo dòng tồn kho khởi điểm bằng 0 (chờ admin nhập hàng);
// SKU đã tồn tại → chỉ cập nhật thông tin mô tả (mã SKU, sản phẩm cha) và mở lại nếu trước đó bị ngừng kinh doanh,
// TUYỆT ĐỐI không đụng vào số lượng tồn — đó là dữ liệu nghiệp vụ riêng của Warehouse, Product không có quyền ghi đè.
async function upsertFromProductSync({ skuId, skuCode, productId }) {
    await db.execute(
        `INSERT INTO inventory (sku_id, sku_code, product_id, quantity_on_hand, quantity_available, status)
         VALUES (?, ?, ?, 0, 0, 'active')
         ON DUPLICATE KEY UPDATE sku_code = VALUES(sku_code), product_id = VALUES(product_id), status = 'active'`,
        [skuId, skuCode, productId]
    );
}

async function markDiscontinued(skuIds) {
    if (skuIds.length === 0) return;
    const placeholders = skuIds.map(() => '?').join(',');
    await db.query(`UPDATE inventory SET status = 'discontinued' WHERE sku_id IN (${placeholders})`, skuIds);
}

module.exports = {
    findBySkuId,
    findBySkuIdForUpdate,
    findActiveLock,
    findExpiredHoldingLocks,
    updateQuantities,
    createLock,
    updateLockStatus,
    insertStockLog,
    countLogs,
    listLogs,
    upsertFromProductSync,
    markDiscontinued,
};
