const db = require('../../config/db');

async function upsertSnapshot({
    orderId, orderCode, userId, totalAmount, itemCount, status,
    recipientName, recipientPhone, shippingAddress,
}) {
    await db.execute(
        `INSERT INTO order_snapshots
            (order_id, order_code, user_id, total_amount, item_count, status,
             recipient_name, recipient_phone, shipping_address)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
            user_id = VALUES(user_id),
            total_amount = VALUES(total_amount),
            item_count = VALUES(item_count),
            status = VALUES(status),
            recipient_name = VALUES(recipient_name),
            recipient_phone = VALUES(recipient_phone),
            shipping_address = VALUES(shipping_address)`,
        [orderId, orderCode, userId, totalAmount, itemCount, status, recipientName, recipientPhone, shippingAddress]
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
