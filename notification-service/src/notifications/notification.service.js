const mailer = require('../config/mailer');
const authClient = require('../clients/auth.client');

// Gửi email tới một địa chỉ đã biết sẵn (vd: 'user.registered' đã mang theo email/fullName
// trong chính sự kiện — không cần tra cứu ngược lại Auth Service).
async function sendToContact(contact, { subject, html }) {
    if (!contact?.email) {
        console.warn('[Notification] Bỏ qua gửi email — không có địa chỉ email hợp lệ:', contact);
        return;
    }
    await mailer.sendMail({ to: contact.email, subject, html });
}

// Tra cứu email/tên người nhận theo userId rồi gửi — dùng cho các sự kiện order/payment/shipping
// vốn chỉ mang theo userId (xem clients/auth.client.js — gọi qua "system token").
async function sendToUserId(userId, buildTemplate) {
    let contact;
    try {
        contact = await authClient.getUserContact(userId);
    } catch (err) {
        console.error(`[Notification] Không thể tra cứu thông tin liên hệ cho userId=${userId}:`, err.message);
        return;
    }

    if (!contact?.email) {
        console.warn(`[Notification] Bỏ qua gửi email — userId=${userId} không có địa chỉ email hợp lệ`);
        return;
    }

    const { subject, html } = buildTemplate(contact);
    await mailer.sendMail({ to: contact.email, subject, html });
}

module.exports = { sendToContact, sendToUserId };
