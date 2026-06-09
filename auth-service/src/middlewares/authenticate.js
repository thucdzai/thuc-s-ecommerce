const AppError = require('../utils/AppError');
const { verifyAccessToken } = require('../utils/jwt');

// Middleware "phòng bảo vệ": yêu cầu FE truyền Bearer Token, BE giải mã và gắn user vào req.
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

// Middleware phân quyền: chỉ cho phép user có ít nhất một trong các role chỉ định.
function authorize(...allowedRoles) {
    return (req, res, next) => {
        const hasRole = req.user?.roles?.some((role) => allowedRoles.includes(role));
        if (!hasRole) {
            return next(new AppError(403, 'Bạn không có quyền thực hiện hành động này'));
        }
        return next();
    };
}

module.exports = { authenticate, authorize };
