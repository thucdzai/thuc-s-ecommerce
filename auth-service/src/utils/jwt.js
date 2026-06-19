const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const env = require('../config/env');

function signAccessToken(payload) {
    return jwt.sign(payload, env.jwt.accessSecret, { expiresIn: env.jwt.accessExpiresIn });
}

function verifyAccessToken(token) {
    return jwt.verify(token, env.jwt.accessSecret);
}

function signRefreshToken(payload) {
    return jwt.sign(payload, env.jwt.refreshSecret, { expiresIn: env.jwt.refreshExpiresIn });
}

function verifyRefreshToken(token) {
    return jwt.verify(token, env.jwt.refreshSecret);
}

// Refresh token chỉ lưu dạng hash trong DB — nếu DB bị lộ, kẻ tấn công vẫn không có token thật để dùng.
function hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
}

function refreshTokenExpiryDate() {
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + env.jwt.refreshExpiresInDays);
    return expiry;
}

module.exports = {
    signAccessToken,
    verifyAccessToken,
    signRefreshToken,
    verifyRefreshToken,
    hashToken,
    refreshTokenExpiryDate,
};
