const db = require('../../config/db');

async function upsertSnapshot({ orderId, orderCode, userId, totalAmount, status }) {
    await db.execute(
        `INSERT INTO order_snapshots (order_id, order_code, user_id, total_amount, status)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
            user_id = VALUES(user_id),
            total_amount = VALUES(total_amount),
            status = VALUES(status)`,
        [orderId, orderCode, userId, totalAmount, status]
    );
}

async function updateStatusByOrderCode(orderCode, status) {
    await db.execute('UPDATE order_snapshots SET status = ? WHERE order_code = ?', [status, orderCode]);
}

async function findByOrderCode(orderCode) {
    const [rows] = await db.execute('SELECT * FROM order_snapshots WHERE order_code = ? LIMIT 1', [orderCode]);
    return rows[0] || null;
}

module.exports = { upsertSnapshot, updateStatusByOrderCode, findByOrderCode };
