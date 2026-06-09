const db = require('../../config/db');

const USER_ROLE_NAME = 'USER';

async function findUserByEmail(email) {
    const [rows] = await db.execute('SELECT * FROM users WHERE email = ? LIMIT 1', [email]);
    return rows[0] || null;
}

async function findUserById(id) {
    const [rows] = await db.execute('SELECT * FROM users WHERE id = ? LIMIT 1', [id]);
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

async function createUser({ email, passwordHash, fullName }) {
    const [result] = await db.execute(
        'INSERT INTO users (email, password_hash, full_name) VALUES (?, ?, ?)',
        [email, passwordHash, fullName]
    );
    return result.insertId;
}

async function assignDefaultRole(userId) {
    const [roleResults] = await db.execute(
        'SELECT id FROM roles WHERE name = ? LIMIT 1',
        [USER_ROLE_NAME]
    );
    if (roleResults.length === 0) {
        throw new Error(`Role '${USER_ROLE_NAME}' not found in database`);
    }
    await db.execute(
        'INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)',
        [userId, roleResults[0].id]
    );
}

async function saveRefreshToken({ userId, tokenHash, deviceInfo, expiresAt }) {
    await db.execute(
        'INSERT INTO refresh_tokens (user_id, token_hash, device_info, expires_at) VALUES (?, ?, ?, ?)',
        [userId, tokenHash, deviceInfo, expiresAt]
    );
}

async function findActiveRefreshToken(tokenHash) {
    const [rows] = await db.execute(
        `SELECT * FROM refresh_tokens
         WHERE token_hash = ? AND revoked_at IS NULL AND expires_at > NOW()
         LIMIT 1`,
        [tokenHash]
    );
    return rows[0] || null;
}

async function revokeRefreshToken(tokenHash) {
    await db.execute('UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = ?', [tokenHash]);
}

module.exports = {
    findUserByEmail,
    findUserById,
    getRoleNamesByUserId,
    createUser,
    assignDefaultRole,
    saveRefreshToken,
    findActiveRefreshToken,
    revokeRefreshToken,
};
