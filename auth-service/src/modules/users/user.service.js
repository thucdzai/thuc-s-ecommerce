const AppError = require('../../utils/AppError');
const userRepository = require('./user.repository');

function toPublicProfile(user, roles) {
    return {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        phone: user.phone,
        avatarUrl: user.avatar_url,
        status: user.status,
        emailVerifiedAt: user.email_verified_at,
        roles,
        createdAt: user.created_at,
    };
}

async function getProfile(userId) {
    const user = await userRepository.findById(userId);
    if (!user) throw new AppError(404, 'Không tìm thấy người dùng');
    const roles = await userRepository.getRoleNamesByUserId(userId);
    return toPublicProfile(user, roles);
}

async function updateProfile(userId, data) {
    const dbFields = {};
    if (data.fullName !== undefined) dbFields.full_name = data.fullName.trim();
    if (data.phone !== undefined) dbFields.phone = data.phone || null;
    if (data.email !== undefined) {
        const existing = await userRepository.findByEmail(data.email);
        if (existing && existing.id !== userId) {
            throw new AppError(409, 'Email này đã được sử dụng bởi tài khoản khác');
        }
        dbFields.email = data.email;
    }
    const user = await userRepository.updateById(userId, dbFields);
    const roles = await userRepository.getRoleNamesByUserId(userId);
    return toPublicProfile(user, roles);
}

async function updateAvatar(userId, filename) {
    const avatarUrl = `/api/users/avatars/${filename}`;
    const user = await userRepository.updateById(userId, { avatar_url: avatarUrl });
    const roles = await userRepository.getRoleNamesByUserId(userId);
    return toPublicProfile(user, roles);
}

// Nội bộ: Notification Service tra cứu email/tên người nhận qua "system token" (role SYSTEM)
async function getContactById(userId) {
    const user = await userRepository.findById(userId);
    if (!user) throw new AppError(404, 'Không tìm thấy người dùng');
    return { id: user.id, email: user.email, fullName: user.full_name, phone: user.phone };
}

module.exports = { getProfile, updateProfile, updateAvatar, getContactById, toPublicProfile };
