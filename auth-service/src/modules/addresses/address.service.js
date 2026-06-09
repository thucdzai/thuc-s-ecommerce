const AppError = require('../../utils/AppError');
const addressRepository = require('./address.repository');

async function ensureOwnership(addressId, userId) {
    const address = await addressRepository.findByIdAndUserId(addressId, userId);
    if (!address) {
        throw new AppError(404, 'Không tìm thấy địa chỉ này trong sổ địa chỉ của bạn');
    }
    return address;
}

async function list(userId) {
    return addressRepository.listByUserId(userId);
}

// Địa chỉ đầu tiên của user luôn được đặt làm mặc định, dù FE không yêu cầu —
// tránh trường hợp user có địa chỉ nhưng không có địa chỉ mặc định nào.
async function create(userId, payload) {
    const existingCount = await addressRepository.countByUserId(userId);
    const isDefault = existingCount === 0 ? true : !!payload.isDefault;

    const addressId = await addressRepository.create({ userId, ...payload, isDefault });
    return addressRepository.findByIdAndUserId(addressId, userId);
}

async function update(userId, addressId, payload) {
    await ensureOwnership(addressId, userId);
    await addressRepository.update(addressId, userId, payload);
    return addressRepository.findByIdAndUserId(addressId, userId);
}

async function remove(userId, addressId) {
    const address = await ensureOwnership(addressId, userId);
    await addressRepository.remove(addressId, userId);

    // Nếu vừa xóa địa chỉ mặc định mà vẫn còn địa chỉ khác, BE tự động chọn địa chỉ mới nhất làm mặc định —
    // FE không phải lo việc "giỏ hàng" thiếu địa chỉ mặc định.
    if (address.isDefault) {
        const remaining = await addressRepository.listByUserId(userId);
        if (remaining.length > 0) {
            await addressRepository.setDefault(remaining[0].id, userId);
        }
    }
}

// Logic cốt lõi mà đề bài yêu cầu: khi khách chọn 1 địa chỉ làm mặc định,
// BE tự động cập nhật toàn bộ địa chỉ còn lại của user về false trong cùng một transaction.
async function setDefault(userId, addressId) {
    await ensureOwnership(addressId, userId);
    await addressRepository.setDefault(addressId, userId);
    return addressRepository.findByIdAndUserId(addressId, userId);
}

module.exports = { list, create, update, remove, setDefault };
