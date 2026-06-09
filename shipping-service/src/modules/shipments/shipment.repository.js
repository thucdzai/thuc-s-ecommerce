const db = require('../../config/db');

// Chạy 1 thao tác trong transaction — gói gọn begin/commit/rollback/release để các hàm nghiệp vụ
// bên dưới chỉ cần tập trung vào logic (cùng pattern với withTransaction của Order/Payment Service).
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

async function insertShipment(connection, {
    orderId, orderCode, userId, carrier, trackingCode,
    recipientName, recipientPhone, shippingAddress, weightKg, fee, status,
}) {
    const [result] = await connection.execute(
        `INSERT INTO shipments
            (order_id, order_code, user_id, carrier, tracking_code,
             recipient_name, recipient_phone, shipping_address, weight_kg, fee, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [orderId, orderCode, userId, carrier, trackingCode,
            recipientName, recipientPhone, shippingAddress, weightKg, fee, status]
    );
    return result.insertId;
}

async function insertStatusLog(connection, shipmentId, status, note) {
    await connection.execute(
        'INSERT INTO shipment_status_logs (shipment_id, status, note) VALUES (?, ?, ?)',
        [shipmentId, status, note || null]
    );
}

// SELECT ... FOR UPDATE — khóa đúng dòng vận đơn này lại trong lúc cập nhật trạng thái,
// tránh 2 request cùng lúc đẩy 1 vận đơn qua 2 trạng thái khác nhau dựa trên cùng 1 bản ghi cũ
// (cùng nguyên tắc khóa dòng mà Order Service áp dụng khi đổi trạng thái đơn).
async function findByIdForUpdate(connection, id) {
    const [rows] = await connection.execute('SELECT * FROM shipments WHERE id = ? FOR UPDATE', [id]);
    return rows[0] || null;
}

async function updateStatus(connection, id, status, { shippedAt, deliveredAt } = {}) {
    await connection.execute(
        `UPDATE shipments
            SET status = ?,
                shipped_at = COALESCE(?, shipped_at),
                delivered_at = COALESCE(?, delivered_at)
          WHERE id = ?`,
        [status, shippedAt || null, deliveredAt || null, id]
    );
}

async function findById(id) {
    const [rows] = await db.execute('SELECT * FROM shipments WHERE id = ? LIMIT 1', [id]);
    return rows[0] || null;
}

async function findByOrderCode(orderCode) {
    const [rows] = await db.execute('SELECT * FROM shipments WHERE order_code = ? LIMIT 1', [orderCode]);
    return rows[0] || null;
}

async function findByOrderCodeAndUser(orderCode, userId) {
    const [rows] = await db.execute(
        'SELECT * FROM shipments WHERE order_code = ? AND user_id = ? LIMIT 1',
        [orderCode, userId]
    );
    return rows[0] || null;
}

async function findLogsByShipmentId(shipmentId) {
    const [rows] = await db.execute(
        'SELECT * FROM shipment_status_logs WHERE shipment_id = ? ORDER BY created_at ASC, id ASC',
        [shipmentId]
    );
    return rows;
}

function buildListFilter({ userId, orderCode, status, carrier }) {
    const conditions = [];
    const params = [];

    if (userId !== undefined) {
        conditions.push('user_id = ?');
        params.push(userId);
    }
    if (orderCode) {
        conditions.push('order_code = ?');
        params.push(orderCode);
    }
    if (status) {
        conditions.push('status = ?');
        params.push(status);
    }
    if (carrier) {
        conditions.push('carrier = ?');
        params.push(carrier);
    }

    return { whereClause: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '', params };
}

async function list(filters, { limit, offset }) {
    const { whereClause, params } = buildListFilter(filters);
    const [rows] = await db.query(
        `SELECT * FROM shipments ${whereClause} ORDER BY created_at DESC LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
        params
    );
    return rows;
}

async function count(filters) {
    const { whereClause, params } = buildListFilter(filters);
    const [rows] = await db.query(`SELECT COUNT(*) AS total FROM shipments ${whereClause}`, params);
    return rows[0].total;
}

module.exports = {
    withTransaction,
    insertShipment,
    insertStatusLog,
    findByIdForUpdate,
    updateStatus,
    findById,
    findByOrderCode,
    findByOrderCodeAndUser,
    findLogsByShipmentId,
    list,
    count,
};
