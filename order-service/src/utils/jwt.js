const jwt = require('jsonwebtoken');
const env = require('../config/env');

// Order Service không phát hành token — chỉ verify chữ ký của Access Token do Auth Service ký
// (các service dùng chung JWT_ACCESS_SECRET để verify).
function verifyAccessToken(token) {
    return jwt.verify(token, env.jwt.accessSecret);
}

module.exports = { verifyAccessToken };
