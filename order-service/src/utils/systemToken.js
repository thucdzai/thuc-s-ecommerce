const jwt = require('jsonwebtoken');
const env = require('../config/env');

// ---------------------------------------------------------------------------
// Token "hệ thống" — Order Service tự ký bằng CHÍNH secret dùng chung (JWT_ACCESS_SECRET) khi cần
// gọi sang Warehouse Service NHƯNG không có sẵn access token của một người dùng cụ thể (vd: xử lý
// sự kiện Kafka 'payment.succeeded' — không có request HTTP nào đi kèm để forward token gốc).
// Warehouse Service chỉ verify chữ ký JWT dùng chung, không phân biệt "ai phát hành" (xem ghi chú
// trong warehouse-service/src/middlewares/authenticate.js: "...hoặc dùng token service-to-service
// có role phù hợp"), nên mint một token ngắn hạn với danh tính "SYSTEM" là đủ và đúng nhất quán.
// sub=0 để không trùng với bất kỳ user_id thật nào (Auth Service luôn AUTO_INCREMENT từ 1).
// ---------------------------------------------------------------------------
function mintSystemAccessToken() {
    return jwt.sign(
        { sub: 0, email: 'system@order-service.internal', roles: ['SYSTEM'] },
        env.jwt.accessSecret,
        { expiresIn: '5m' }
    );
}

module.exports = { mintSystemAccessToken };
