const db = require('../../config/db');

async function findManyBySkuIds(skuIds) {
    if (skuIds.length === 0) return [];
    const placeholders = skuIds.map(() => '?').join(',');
    const [rows] = await db.query(`SELECT * FROM product_snapshots WHERE sku_id IN (${placeholders})`, skuIds);
    return rows;
}

async function upsertSnapshot({ skuId, skuCode, productId, productName, price, compareAtPrice, status }) {
    await db.execute(
        `INSERT INTO product_snapshots
            (sku_id, sku_code, product_id, product_name, price, compare_at_price, status)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
            sku_code = VALUES(sku_code),
            product_id = VALUES(product_id),
            product_name = VALUES(product_name),
            price = VALUES(price),
            compare_at_price = VALUES(compare_at_price),
            status = VALUES(status)`,
        [skuId, skuCode, productId, productName, price, compareAtPrice, status]
    );
}

async function markDiscontinued(skuIds) {
    if (skuIds.length === 0) return;
    const placeholders = skuIds.map(() => '?').join(',');
    await db.query(`UPDATE product_snapshots SET status = 'discontinued' WHERE sku_id IN (${placeholders})`, skuIds);
}

module.exports = { findManyBySkuIds, upsertSnapshot, markDiscontinued };
