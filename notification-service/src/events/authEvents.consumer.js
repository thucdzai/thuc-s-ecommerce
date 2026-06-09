const templates = require('../notifications/emailTemplates');
const notificationService = require('../notifications/notification.service');

// 'user.registered' đã mang theo email/fullName ngay trong sự kiện (xem
// auth-service/src/events/authEvents.publisher.js) — không cần gọi ngược lại Auth Service
// để tra cứu, nên gửi thẳng bằng sendToContact.
async function handle(envelope) {
    const { eventType, data } = envelope;

    if (eventType !== 'user.registered') {
        return;
    }

    console.log(`[Notification] Nhận sự kiện '${eventType}' — chuẩn bị gửi email chào mừng tới "${data.email}"`);
    await notificationService.sendToContact(
        { email: data.email },
        templates.welcome({ fullName: data.fullName })
    );
}

module.exports = { handle };
