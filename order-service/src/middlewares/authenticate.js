const AppError = require('../utils/AppError');
const { verifyAccessToken } = require('../utils/jwt');

// Yêu cầu request gắn Bearer Token (do Auth Service phát hành) — Order Service giải mã,
// gắn user vào req, và forward nguyên token này sang Warehouse Service khi cần (xem warehouse.client.js).
function authenticate(req, res, next) {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');

    if (scheme !== 'Bearer' || !token) {
        return next(new AppError(401, 'Thiếu hoặc sai định dạng access token'));
    }

    try {
        const payload = verifyAccessToken(token);
        req.user = { id: payload.sub, email: payload.email, roles: payload.roles || [] };
        req.accessToken = token;
        return next();
    } catch (err) {
        return next(new AppError(401, 'Access token không hợp lệ hoặc đã hết hạn'));
    }
}

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
