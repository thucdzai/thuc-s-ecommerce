const jwt = require('jsonwebtoken');
const env = require('../config/env');

// Product Service không phát hành token — chỉ verify chữ ký của Access Token do Auth Service ký
// (hai service dùng chung JWT_ACCESS_SECRET).
function verifyAccessToken(token) {
    return jwt.verify(token, env.jwt.accessSecret);
}

module.exports = { verifyAccessToken };
