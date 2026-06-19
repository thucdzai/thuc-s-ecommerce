const templates = require('../notifications/emailTemplates');
const notificationService = require('../notifications/notification.service');

// Chỉ gửi email khi thanh toán THÀNH CÔNG — 'payment.failed' thường đi kèm việc khách tự thử lại
// ngay trên trang thanh toán (đã thấy lỗi trực tiếp trên UI), gửi thêm email dễ gây nhiễu/trùng lặp.
async function handle(envelope) {
    const { eventType, data } = envelope;

    if (eventType !== 'payment.succeeded') {
        return;
    }

    console.log(`[Notification] Nhận sự kiện '${eventType}' — chuẩn bị gửi email xác nhận thanh toán cho đơn ${data.orderCode} tới userId=${data.userId}`);
    await notificationService.sendToUserId(data.userId, (contact) => templates.paymentSucceeded({
        orderCode: data.orderCode,
        amount: data.amount,
        fullName: contact.fullName,
    }));
}

module.exports = { handle };
