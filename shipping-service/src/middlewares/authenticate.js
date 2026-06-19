const AppError = require('../utils/AppError');
const { verifyAccessToken } = require('../utils/jwt');

// Yêu cầu request gắn Bearer Token — Shipping Service giải mã và gắn user vào req.
// Token có thể do Auth Service phát hành (khách tự thao tác) hoặc do Order Service tự ký
// bằng token hệ thống khi cần tra cứu nội bộ — Shipping Service chỉ verify chữ ký dùng chung,
// không phân biệt nguồn gốc (cùng triết lý với Warehouse/Payment Service).
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
