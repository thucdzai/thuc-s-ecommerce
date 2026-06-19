const kafka = require('../config/kafka');
const { AUTH_EVENTS } = require('./topics');

// Phát sự kiện vòng đời tài khoản lên Kafka — Notification Service lắng nghe để tự gửi email
// chào mừng, theo đúng triết lý "giảm coupling" mà Product/Order/Payment/Shipping Service đã áp
// dụng: Auth Service không cần biết hay gọi trực tiếp sang Notification Service. Gửi kèm
// email/fullName ngay trong sự kiện để Notification Service không phải gọi ngược lại tra cứu.
async function publishUserRegistered({ userId, email, fullName }) {
    await kafka.publishEvent(AUTH_EVENTS, 'user.registered', { userId, email, fullName }, String(userId));
}

async function publishPasswordResetRequested({ email, fullName, resetUrl }) {
    await kafka.publishEvent(AUTH_EVENTS, 'user.password_reset_requested', { email, fullName, resetUrl }, email);
}

module.exports = { publishUserRegistered, publishPasswordResetRequested };
