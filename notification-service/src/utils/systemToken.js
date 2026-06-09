const jwt = require('jsonwebtoken');
const env = require('../config/env');

// Token "hệ thống" — Notification Service tự ký bằng CHÍNH secret dùng chung (JWT_ACCESS_SECRET)
// để gọi GET /api/users/:id/contact khi xử lý sự kiện Kafka (order.created, payment.succeeded...)
// vốn chỉ mang theo userId chứ không có access token thật của người dùng nào đi kèm.
// Cùng pattern với order-service/src/utils/systemToken.js — sub=0 để không trùng user_id thật.
function mintSystemAccessToken() {
    return jwt.sign(
        { sub: 0, email: 'system@notification-service.internal', roles: ['SYSTEM'] },
        env.jwt.accessSecret,
        { expiresIn: '5m' }
    );
}

module.exports = { mintSystemAccessToken };
