const db = require('../../config/db');

// ---------------------------------------------------------------------------
// Carts — mỗi user có đúng 1 giỏ hàng, được tạo "lười" (lazy) ở lần đầu thao tác.
// ---------------------------------------------------------------------------

async function findCartByUserId(userId) {
    const [rows] = await db.execute('SELECT * FROM carts WHERE user_id = ? LIMIT 1', [userId]);
    return rows[0] || null;
}

async function createCart(userId) {
    const [result] = await db.execute('INSERT INTO carts (user_id) VALUES (?)', [userId]);
    return { id: result.insertId, user_id: userId };
}

// ---------------------------------------------------------------------------
// Cart items — kèm JOIN sang product_snapshots để lấy tên/giá hiện hành trong 1 lần truy vấn,
// Service sẽ dùng dữ liệu này để tính lineTotal/cartTotal — Repository không tính toán nghiệp vụ.
// ---------------------------------------------------------------------------

async function findItemsWithSnapshot(cartId) {
    const [rows] = await db.execute(
        `SELECT
            ci.id, ci.sku_id, ci.quantity, ci.created_at, ci.updated_at,
            ps.sku_code, ps.product_id, ps.product_name, ps.product_slug,
            ps.price, ps.compare_at_price, ps.status AS product_status
         FROM cart_items ci
         LEFT JOIN product_snapshots ps ON ps.sku_id = ci.sku_id
         WHERE ci.cart_id = ?
         ORDER BY ci.created_at ASC`,
        [cartId]
    );
    return rows;
}

async function findItem(cartId, skuId) {
    const [rows] = await db.execute(
        'SELECT * FROM cart_items WHERE cart_id = ? AND sku_id = ? LIMIT 1',
        [cartId, skuId]
    );
    return rows[0] || null;
}

async function insertItem(cartId, skuId, quantity) {
    const [result] = await db.execute(
        'INSERT INTO cart_items (cart_id, sku_id, quantity) VALUES (?, ?, ?)',
        [cartId, skuId, quantity]
    );
    return result.insertId;
}

async function updateItemQuantity(cartId, skuId, quantity) {
    await db.execute(
        'UPDATE cart_items SET quantity = ? WHERE cart_id = ? AND sku_id = ?',
        [quantity, cartId, skuId]
    );
}

async function deleteItem(cartId, skuId) {
    const [result] = await db.execute(
        'DELETE FROM cart_items WHERE cart_id = ? AND sku_id = ?',
        [cartId, skuId]
    );
    return result.affectedRows > 0;
}

async function deleteAllItems(cartId) {
    await db.execute('DELETE FROM cart_items WHERE cart_id = ?', [cartId]);
}

// ---------------------------------------------------------------------------
// Product snapshots — "bản sao đọc" tên/giá sản phẩm, đồng bộ qua sự kiện Kafka 'product-events'.
// ---------------------------------------------------------------------------

async function findSnapshotBySkuId(skuId) {
    const [rows] = await db.execute('SELECT * FROM product_snapshots WHERE sku_id = ? LIMIT 1', [skuId]);
    return rows[0] || null;
}

async function upsertSnapshot({ skuId, skuCode, productId, productName, productSlug, price, compareAtPrice, status }) {
    await db.execute(
        `INSERT INTO product_snapshots
            (sku_id, sku_code, product_id, product_name, product_slug, price, compare_at_price, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
            sku_code = VALUES(sku_code),
            product_id = VALUES(product_id),
            product_name = VALUES(product_name),
            product_slug = VALUES(product_slug),
            price = VALUES(price),
            compare_at_price = VALUES(compare_at_price),
            status = VALUES(status)`,
        [skuId, skuCode, productId, productName, productSlug, price, compareAtPrice, status]
    );
}

async function markSnapshotsDiscontinued(skuIds) {
    if (skuIds.length === 0) return;
    const placeholders = skuIds.map(() => '?').join(',');
    await db.query(`UPDATE product_snapshots SET status = 'discontinued' WHERE sku_id IN (${placeholders})`, skuIds);
}

module.exports = {
    findCartByUserId,
    createCart,
    findItemsWithSnapshot,
    findItem,
    insertItem,
    updateItemQuantity,
    deleteItem,
    deleteAllItems,
    findSnapshotBySkuId,
    upsertSnapshot,
    markSnapshotsDiscontinued,
};
