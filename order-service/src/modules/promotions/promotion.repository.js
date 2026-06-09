const db = require('../../config/db');

async function findByCode(code) {
    const [rows] = await db.execute('SELECT * FROM promotions WHERE code = ? LIMIT 1', [code]);
    return rows[0] || null;
}

async function findById(id) {
    const [rows] = await db.execute('SELECT * FROM promotions WHERE id = ? LIMIT 1', [id]);
    return rows[0] || null;
}

// SELECT ... FOR UPDATE bên trong transaction checkout — khóa đúng dòng khuyến mãi này lại,
// đảm bảo nhiều đơn cùng lúc dùng chung 1 mã có usage_limit không bao giờ vượt quá giới hạn
// (tránh race condition tương tự "bán lố hàng" mà Warehouse Service đã xử lý cho tồn kho).
async function findByCodeForUpdate(connection, code) {
    const [rows] = await connection.execute('SELECT * FROM promotions WHERE code = ? FOR UPDATE', [code]);
    return rows[0] || null;
}

async function incrementUsedCount(connection, id) {
    await connection.execute('UPDATE promotions SET used_count = used_count + 1 WHERE id = ?', [id]);
}

async function decrementUsedCount(connection, id) {
    await connection.execute('UPDATE promotions SET used_count = GREATEST(0, used_count - 1) WHERE id = ?', [id]);
}

function buildListFilter({ status, code }) {
    const conditions = [];
    const params = [];

    if (status) {
        conditions.push('status = ?');
        params.push(status);
    }
    if (code) {
        conditions.push('code LIKE ?');
        params.push(`%${code}%`);
    }

    return { whereClause: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '', params };
}

async function list(filters, { limit, offset }) {
    const { whereClause, params } = buildListFilter(filters);
    const [rows] = await db.query(
        `SELECT * FROM promotions ${whereClause} ORDER BY created_at DESC LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
        params
    );
    return rows;
}

async function count(filters) {
    const { whereClause, params } = buildListFilter(filters);
    const [rows] = await db.query(`SELECT COUNT(*) AS total FROM promotions ${whereClause}`, params);
    return rows[0].total;
}

async function create({ code, description, discountType, discountValue, maxDiscountAmount, minOrderAmount, usageLimit, startsAt, endsAt, status }) {
    const [result] = await db.execute(
        `INSERT INTO promotions
            (code, description, discount_type, discount_value, max_discount_amount, min_order_amount, usage_limit, starts_at, ends_at, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [code, description ?? null, discountType, discountValue, maxDiscountAmount ?? null, minOrderAmount, usageLimit ?? null, startsAt, endsAt, status]
    );
    return result.insertId;
}

async function update(id, { description, discountType, discountValue, maxDiscountAmount, minOrderAmount, usageLimit, startsAt, endsAt, status }) {
    await db.execute(
        `UPDATE promotions SET
            description = ?, discount_type = ?, discount_value = ?, max_discount_amount = ?,
            min_order_amount = ?, usage_limit = ?, starts_at = ?, ends_at = ?, status = ?
         WHERE id = ?`,
        [description ?? null, discountType, discountValue, maxDiscountAmount ?? null, minOrderAmount, usageLimit ?? null, startsAt, endsAt, status, id]
    );
}

module.exports = {
    findByCode,
    findById,
    findByCodeForUpdate,
    incrementUsedCount,
    decrementUsedCount,
    list,
    count,
    create,
    update,
};
