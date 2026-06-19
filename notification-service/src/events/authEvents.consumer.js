const templates = require('../notifications/emailTemplates');
const notificationService = require('../notifications/notification.service');

// 'user.registered' đã mang theo email/fullName ngay trong sự kiện (xem
// auth-service/src/events/authEvents.publisher.js) — không cần gọi ngược lại Auth Service
// để tra cứu, nên gửi thẳng bằng sendToContact.
async function handle(envelope) {
    const { eventType, data } = envelope;

    if (eventType === 'user.registered') {
        console.log(`[Notification] Nhận sự kiện '${eventType}' — gửi email chào mừng tới "${data.email}"`);
        await notificationService.sendToContact(
            { email: data.email },
            templates.welcome({ fullName: data.fullName })
        );
        return;
    }

    if (eventType === 'user.password_reset_requested') {
        console.log(`[Notification] Nhận sự kiện '${eventType}' — gửi email đặt lại mật khẩu tới "${data.email}"`);
        await notificationService.sendToContact(
            { email: data.email },
            templates.passwordReset({ fullName: data.fullName, resetUrl: data.resetUrl })
        );
        return;
    }
}

module.exports = { handle };
