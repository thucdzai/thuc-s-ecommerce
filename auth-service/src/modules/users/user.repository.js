const db = require('../../config/db');

async function findById(id) {
    const [rows] = await db.execute('SELECT * FROM users WHERE id = ? LIMIT 1', [id]);
    return rows[0] || null;
}

async function findByEmail(email) {
    const [rows] = await db.execute('SELECT * FROM users WHERE email = ? LIMIT 1', [email]);
    return rows[0] || null;
}

async function getRoleNamesByUserId(userId) {
    const [rows] = await db.execute(
        `SELECT r.name
         FROM user_roles ur
         JOIN roles r ON r.id = ur.role_id
         WHERE ur.user_id = ?`,
        [userId]
    );
    return rows.map((row) => row.name);
}

async function updateById(id, fields) {
    const keys = Object.keys(fields);
    if (keys.length === 0) return findById(id);
    const setClause = keys.map((k) => `\`${k}\` = ?`).join(', ');
    const values = [...keys.map((k) => fields[k]), id];
    await db.execute(`UPDATE users SET ${setClause} WHERE id = ?`, values);
    return findById(id);
}

async function updateStatusById(id, status) {
    await db.execute('UPDATE users SET status = ? WHERE id = ?', [status, id]);
    return findById(id);
}

async function listAll({ page = 1, limit = 20, q = '' } = {}) {
    // mysql2 execute() dùng prepared statement nhị phân — LIMIT/OFFSET phải là integer
    // thực sự (không phải float). Dùng db.query() để tránh lỗi ER_WRONG_ARGUMENTS.
    const limitInt = Math.max(1, parseInt(limit, 10));
    const offsetInt = Math.max(0, (parseInt(page, 10) - 1) * limitInt);
    const likeQ = `%${q}%`;

    const [rows] = q
        ? await db.query(
              'SELECT id, email, full_name, phone, avatar_url, status, created_at FROM users WHERE email LIKE ? OR full_name LIKE ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
              [likeQ, likeQ, limitInt, offsetInt]
          )
        : await db.query(
              'SELECT id, email, full_name, phone, avatar_url, status, created_at FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?',
              [limitInt, offsetInt]
          );

    const [[{ total }]] = q
        ? await db.query('SELECT COUNT(*) as total FROM users WHERE email LIKE ? OR full_name LIKE ?', [likeQ, likeQ])
        : await db.query('SELECT COUNT(*) as total FROM users');

    return {
        items: rows.map((u) => ({
            id: u.id,
            email: u.email,
            fullName: u.full_name,
            phone: u.phone,
            avatarUrl: u.avatar_url,
            status: u.status,
            createdAt: u.created_at,
        })),
        meta: { page, limit, totalItems: total, totalPages: Math.ceil(total / limit) },
    };
}

module.exports = { findById, findByEmail, getRoleNamesByUserId, updateById, updateStatusById, listAll };
