const asyncHandler = require('../../utils/asyncHandler');
const { ok, created } = require('../../utils/apiResponse');
const AppError = require('../../utils/AppError');
const addressService = require('./address.service');

// Khách chỉ được thao tác trên sổ địa chỉ của chính mình; ADMIN được xem của bất kỳ ai.
function assertSelfOrAdmin(req) {
    const targetUserId = Number(req.params.userId);
    const isSelf = req.user.id === targetUserId;
    const isAdmin = req.user.roles.includes('ADMIN');

    if (!isSelf && !isAdmin) {
        throw new AppError(403, 'Bạn không có quyền truy cập sổ địa chỉ này');
    }
    return targetUserId;
}

const list = asyncHandler(async (req, res) => {
    const userId = assertSelfOrAdmin(req);
    const addresses = await addressService.list(userId);
    return ok(res, addresses, 'Lấy danh sách địa chỉ thành công');
});

const create = asyncHandler(async (req, res) => {
    const userId = assertSelfOrAdmin(req);
    const address = await addressService.create(userId, req.body);
    return created(res, address, 'Thêm địa chỉ thành công');
});

const update = asyncHandler(async (req, res) => {
    const userId = assertSelfOrAdmin(req);
    const address = await addressService.update(userId, Number(req.params.addressId), req.body);
    return ok(res, address, 'Cập nhật địa chỉ thành công');
});

const remove = asyncHandler(async (req, res) => {
    const userId = assertSelfOrAdmin(req);
    await addressService.remove(userId, Number(req.params.addressId));
    return ok(res, null, 'Xóa địa chỉ thành công');
});

const setDefault = asyncHandler(async (req, res) => {
    const userId = assertSelfOrAdmin(req);
    const address = await addressService.setDefault(userId, Number(req.params.addressId));
    return ok(res, address, 'Đặt địa chỉ mặc định thành công');
});

module.exports = { list, create, update, remove, setDefault };
