const db = require('../../config/db');

// Chạy 1 thao tác trong transaction — gói gọn begin/commit/rollback/release để các hàm nghiệp vụ
// bên dưới chỉ cần tập trung vào logic, không lặp lại boilerplate quản lý connection
// (cùng pattern với withTransaction của Warehouse Service).
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

// ---------------------------------------------------------------------------
// Ghi dữ liệu — chạy trong transaction do order.service điều phối.
// ---------------------------------------------------------------------------

async function insertOrder(connection, {
    orderCode, userId, status, subtotalAmount, discountAmount, shippingFee, totalAmount,
    promotionId, promotionCode, recipientName, recipientPhone, shippingAddress, note,
}) {
    const [result] = await connection.execute(
        `INSERT INTO orders
            (order_code, user_id, status, subtotal_amount, discount_amount, shipping_fee, total_amount,
             promotion_id, promotion_code, recipient_name, recipient_phone, shipping_address, note)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [orderCode, userId, status, subtotalAmount, discountAmount, shippingFee, totalAmount,
            promotionId, promotionCode, recipientName, recipientPhone, shippingAddress, note]
    );
    return result.insertId;
}

async function insertOrderItems(connection, orderId, items) {
    const values = items.map((item) => [
        orderId, item.skuId, item.skuCode, item.productId, item.productName, item.price, item.quantity, item.lineTotal,
    ]);
    await connection.query(
        `INSERT INTO order_items (order_id, sku_id, sku_code, product_id, product_name, price, quantity, line_total)
         VALUES ?`,
        [values]
    );
}

async function updateStatus(connection, orderId, status) {
    await connection.execute('UPDATE orders SET status = ? WHERE id = ?', [status, orderId]);
}

// SELECT ... FOR UPDATE — khóa đúng dòng đơn hàng này lại trong lúc Admin đổi trạng thái,
// tránh 2 request cùng lúc đẩy 1 đơn qua 2 trạng thái khác nhau dựa trên cùng 1 bản ghi cũ.
async function findByIdForUpdate(connection, id) {
    const [rows] = await connection.execute('SELECT * FROM orders WHERE id = ? FOR UPDATE', [id]);
    return rows[0] || null;
}

// ---------------------------------------------------------------------------
// Đọc dữ liệu (ngoài transaction).
// ---------------------------------------------------------------------------

async function findById(id) {
    const [rows] = await db.execute('SELECT * FROM orders WHERE id = ? LIMIT 1', [id]);
    return rows[0] || null;
}

// Tra đơn theo order_code — dùng khi xử lý sự kiện 'payment.succeeded' từ Payment Service
// (Kafka chỉ mang theo orderCode, không có id nội bộ của bên nhận).
async function findByOrderCode(orderCode) {
    const [rows] = await db.execute('SELECT * FROM orders WHERE order_code = ? LIMIT 1', [orderCode]);
    return rows[0] || null;
}

async function findByIdAndUser(id, userId) {
    const [rows] = await db.execute('SELECT * FROM orders WHERE id = ? AND user_id = ? LIMIT 1', [id, userId]);
    return rows[0] || null;
}

async function findItemsByOrderId(orderId) {
    const [rows] = await db.execute(
        'SELECT * FROM order_items WHERE order_id = ? ORDER BY id ASC',
        [orderId]
    );
    return rows;
}

function buildListFilter({ userId, status }) {
    const conditions = [];
    const params = [];

    if (userId !== undefined) {
        conditions.push('user_id = ?');
        params.push(userId);
    }
    if (status) {
        conditions.push('status = ?');
        params.push(status);
    }

    return { whereClause: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '', params };
}

async function list(filters, { limit, offset }) {
    const { whereClause, params } = buildListFilter(filters);
    const [rows] = await db.query(
        `SELECT * FROM orders ${whereClause} ORDER BY created_at DESC LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
        params
    );
    return rows;
}

async function count(filters) {
    const { whereClause, params } = buildListFilter(filters);
    const [rows] = await db.query(`SELECT COUNT(*) AS total FROM orders ${whereClause}`, params);
    return rows[0].total;
}

module.exports = {
    withTransaction,
    insertOrder,
    insertOrderItems,
    updateStatus,
    findByIdForUpdate,
    findById,
    findByOrderCode,
    findByIdAndUser,
    findItemsByOrderId,
    list,
    count,
};
