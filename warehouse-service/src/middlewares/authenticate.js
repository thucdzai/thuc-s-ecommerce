const AppError = require('../utils/AppError');
const { verifyAccessToken } = require('../utils/jwt');

// Yêu cầu request gắn Bearer Token (do Auth Service phát hành) vào header — BE giải mã và gắn user vào req.
// Order/Payment Service khi gọi sang đây cần forward token của người dùng (hoặc dùng token service-to-service
// có role phù hợp) — Warehouse Service chỉ biết verify chữ ký, không quan tâm ai là người phát hành request gốc.
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
