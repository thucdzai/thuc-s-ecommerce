const asyncHandler = require('../../utils/asyncHandler');
const { ok } = require('../../utils/apiResponse');
const userService = require('./user.service');
const AppError = require('../../utils/AppError');

const getProfile = asyncHandler(async (req, res) => {
    const profile = await userService.getProfile(req.user.id);
    return ok(res, profile, 'Lấy thông tin tài khoản thành công');
});

const updateProfile = asyncHandler(async (req, res) => {
    const profile = await userService.updateProfile(req.user.id, req.body);
    return ok(res, profile, 'Cập nhật hồ sơ thành công');
});

const uploadAvatar = asyncHandler(async (req, res) => {
    if (!req.file) throw new AppError(422, 'Không có file được tải lên');
    const profile = await userService.updateAvatar(req.user.id, req.file.filename);
    return ok(res, profile, 'Cập nhật ảnh đại diện thành công');
});

const getContactById = asyncHandler(async (req, res) => {
    const contact = await userService.getContactById(Number(req.params.id));
    return ok(res, contact, 'Lấy thông tin liên hệ thành công');
});

module.exports = { getProfile, updateProfile, uploadAvatar, getContactById };
