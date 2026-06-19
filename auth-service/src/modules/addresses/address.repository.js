const db = require('../../config/db');

function mapRow(row) {
    return {
        id: row.id,
        userId: row.user_id,
        recipientName: row.recipient_name,
        phone: row.phone,
        province: row.province,
        district: row.district,
        ward: row.ward,
        streetDetail: row.street_detail,
        isDefault: !!row.is_default,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

async function listByUserId(userId) {
    const [rows] = await db.execute(
        'SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, created_at DESC',
        [userId]
    );
    return rows.map(mapRow);
}

async function findByIdAndUserId(addressId, userId) {
    const [rows] = await db.execute('SELECT * FROM addresses WHERE id = ? AND user_id = ? LIMIT 1', [addressId, userId]);
    return rows[0] ? mapRow(rows[0]) : null;
}

async function countByUserId(userId) {
    const [rows] = await db.execute('SELECT COUNT(*) AS total FROM addresses WHERE user_id = ?', [userId]);
    return rows[0].total;
}

// Tạo địa chỉ mới. Nếu đánh dấu là mặc định, BE tự gỡ cờ mặc định khỏi các địa chỉ khác trong cùng giao dịch.
async function create({ userId, recipientName, phone, province, district, ward, streetDetail, isDefault }) {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        if (isDefault) {
            await connection.execute('UPDATE addresses SET is_default = 0 WHERE user_id = ?', [userId]);
        }

        const [result] = await connection.execute(
            `INSERT INTO addresses (user_id, recipient_name, phone, province, district, ward, street_detail, is_default)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [userId, recipientName, phone, province, district, ward, streetDetail, isDefault ? 1 : 0]
        );

        await connection.commit();
        return result.insertId;
    } catch (err) {
        await connection.rollback();
        throw err;
    } finally {
        connection.release();
    }
}

async function update(addressId, userId, fields) {
    const { recipientName, phone, province, district, ward, streetDetail } = fields;
    await db.execute(
        `UPDATE addresses
         SET recipient_name = ?, phone = ?, province = ?, district = ?, ward = ?, street_detail = ?
         WHERE id = ? AND user_id = ?`,
        [recipientName, phone, province, district, ward, streetDetail, addressId, userId]
    );
}

async function remove(addressId, userId) {
    await db.execute('DELETE FROM addresses WHERE id = ? AND user_id = ?', [addressId, userId]);
}

// Đặt một địa chỉ làm mặc định: gỡ cờ mặc định khỏi toàn bộ địa chỉ khác của user trong cùng 1 transaction,
// đảm bảo tại mọi thời điểm chỉ có duy nhất một địa chỉ mặc định — FE không cần và không được tự xử lý việc này.
async function setDefault(addressId, userId) {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        await connection.execute('UPDATE addresses SET is_default = 0 WHERE user_id = ?', [userId]);
        await connection.execute('UPDATE addresses SET is_default = 1 WHERE id = ? AND user_id = ?', [addressId, userId]);
        await connection.commit();
    } catch (err) {
        await connection.rollback();
        throw err;
    } finally {
        connection.release();
    }
}

module.exports = {
    listByUserId,
    findByIdAndUserId,
    countByUserId,
    create,
    update,
    remove,
    setDefault,
};
