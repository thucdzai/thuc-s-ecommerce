const asyncHandler = require('../../utils/asyncHandler');
const { ok, created } = require('../../utils/apiResponse');
const authService = require('./auth.service');

const register = asyncHandler(async (req, res) => {
    const user = await authService.register(req.body);
    return created(res, user, 'Đăng ký tài khoản thành công');
});

const login = asyncHandler(async (req, res) => {
    const deviceInfo = req.headers['user-agent'] || null;
    const result = await authService.login(req.body, deviceInfo);
    return ok(res, result, 'Đăng nhập thành công');
});

const refreshToken = asyncHandler(async (req, res) => {
    const deviceInfo = req.headers['user-agent'] || null;
    const tokens = await authService.refresh(req.body.refreshToken, deviceInfo);
    return ok(res, tokens, 'Làm mới token thành công');
});

const logout = asyncHandler(async (req, res) => {
    await authService.logout(req.body.refreshToken);
    return ok(res, null, 'Đăng xuất thành công');
});

module.exports = { register, login, refreshToken, logout };
