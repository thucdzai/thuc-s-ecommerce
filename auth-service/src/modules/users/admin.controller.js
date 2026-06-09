const asyncHandler = require('../../utils/asyncHandler');
const { ok, paginated } = require('../../utils/apiResponse');
const userRepository = require('./user.repository');
const userService = require('./user.service');
const AppError = require('../../utils/AppError');

const list = asyncHandler(async (req, res) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const q = req.query.q?.trim() || '';
    const result = await userRepository.listAll({ page, limit, q });
    return paginated(res, result.items, result.meta, 'Lấy danh sách người dùng thành công');
});

const banUser = asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const user = await userRepository.findById(id);
    if (!user) throw new AppError(404, 'Không tìm thấy người dùng');
    if (user.status === 'banned') throw new AppError(400, 'Tài khoản này đã bị khóa');
    const updated = await userRepository.updateStatusById(id, 'banned');
    const roles = await userRepository.getRoleNamesByUserId(id);
    return ok(res, userService.toPublicProfile(updated, roles), 'Đã khóa tài khoản');
});

const unbanUser = asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const user = await userRepository.findById(id);
    if (!user) throw new AppError(404, 'Không tìm thấy người dùng');
    if (user.status === 'active') throw new AppError(400, 'Tài khoản này chưa bị khóa');
    const updated = await userRepository.updateStatusById(id, 'active');
    const roles = await userRepository.getRoleNamesByUserId(id);
    return ok(res, userService.toPublicProfile(updated, roles), 'Đã mở khóa tài khoản');
});

module.exports = { list, banUser, unbanUser };
