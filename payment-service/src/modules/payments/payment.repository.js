const db = require('../../config/db');

// Chạy 1 thao tác trong transaction — gói gọn begin/commit/rollback/release để các hàm nghiệp vụ
// bên dưới chỉ cần tập trung vào logic (cùng pattern với withTransaction của Order Service).
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

async function insertTransaction({ orderId, orderCode, userId, amount, provider, txnRef, status, expiresAt }) {
    const [result] = await db.execute(
        `INSERT INTO payment_transactions
            (order_id, order_code, user_id, amount, provider, txn_ref, status, expires_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [orderId, orderCode, userId, amount, provider, txnRef, status, expiresAt]
    );
    return result.insertId;
}

// Khóa dòng giao dịch lại trong transaction khi xử lý IPN — chặn trường hợp VNPay gọi IPN
// trùng lặp (retry) cùng lúc dẫn đến cộng dồn hiệu ứng phụ (publish event 2 lần, đổi trạng thái 2 lần).
async function findByTxnRefForUpdate(connection, txnRef) {
    const [rows] = await connection.execute('SELECT * FROM payment_transactions WHERE txn_ref = ? FOR UPDATE', [txnRef]);
    return rows[0] || null;
}

async function updateResultByTxnRef(connection, txnRef, { status, bankCode, providerTransactionId, providerResponse, paidAt }) {
    await connection.execute(
        `UPDATE payment_transactions
            SET status = ?, bank_code = ?, provider_transaction_id = ?, provider_response = ?, paid_at = ?
          WHERE txn_ref = ?`,
        [status, bankCode, providerTransactionId, providerResponse, paidAt, txnRef]
    );
}

async function findByTxnRef(txnRef) {
    const [rows] = await db.execute('SELECT * FROM payment_transactions WHERE txn_ref = ? LIMIT 1', [txnRef]);
    return rows[0] || null;
}

async function findById(id) {
    const [rows] = await db.execute('SELECT * FROM payment_transactions WHERE id = ? LIMIT 1', [id]);
    return rows[0] || null;
}

// Giao dịch mới nhất của 1 đơn — khách có thể tạo lại URL thanh toán nhiều lần (mỗi lần 1 txn_ref
// riêng) nếu lần trước hết hạn/thất bại, nên "trạng thái thanh toán hiện tại của đơn" = giao dịch mới nhất.
async function findLatestByOrderCode(orderCode) {
    const [rows] = await db.execute(
        'SELECT * FROM payment_transactions WHERE order_code = ? ORDER BY created_at DESC LIMIT 1',
        [orderCode]
    );
    return rows[0] || null;
}

function buildListFilter({ userId, orderCode, status }) {
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

    return { whereClause: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '', params };
}

async function list(filters, { limit, offset }) {
    const { whereClause, params } = buildListFilter(filters);
    const [rows] = await db.query(
        `SELECT * FROM payment_transactions ${whereClause} ORDER BY created_at DESC LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
        params
    );
    return rows;
}

async function count(filters) {
    const { whereClause, params } = buildListFilter(filters);
    const [rows] = await db.query(`SELECT COUNT(*) AS total FROM payment_transactions ${whereClause}`, params);
    return rows[0].total;
}

module.exports = {
    withTransaction,
    insertTransaction,
    findByTxnRefForUpdate,
    updateResultByTxnRef,
    findByTxnRef,
    findById,
    findLatestByOrderCode,
    list,
    count,
};
