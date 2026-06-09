const AppError = require('../utils/AppError');
const { verifyAccessToken } = require('../utils/jwt');

// Giỏ hàng luôn gắn liền với 1 người dùng đã đăng nhập — mọi route của module cart đều
// bắt buộc Bearer Token hợp lệ (do Auth Service phát hành), Cart Service chỉ giải mã và lấy userId.
function authenticate(req, res, next) {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');

    if (scheme !== 'Bearer' || !token) {
        return next(new AppError(401, 'Thiếu hoặc sai định dạng access token'));
    }

    try {
        const payload = verifyAccessToken(token);
        req.user = { id: payload.sub, email: payload.email, roles: payload.roles || [] };
        return next();
    } catch (err) {
        return next(new AppError(401, 'Access token không hợp lệ hoặc đã hết hạn'));
    }
}

module.exports = { authenticate };
