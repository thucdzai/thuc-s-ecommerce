const jwt = require('jsonwebtoken');
const env = require('../config/env');

// Payment Service không phát hành token cho người dùng — chỉ verify chữ ký của Access Token
// do Auth Service ký (hoặc token hệ thống do Order Service tự ký bằng chung secret này).
function verifyAccessToken(token) {
    return jwt.verify(token, env.jwt.accessSecret);
}

module.exports = { verifyAccessToken };
