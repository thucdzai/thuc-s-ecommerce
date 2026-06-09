const templates = require('../notifications/emailTemplates');
const notificationService = require('../notifications/notification.service');

// Chỉ thông báo ở các mốc khách hàng thực sự quan tâm theo dõi: lấy hàng, giao thành công,
// giao thất bại. Bỏ qua 'shipment.created' (khách chưa cần biết ngay lúc tạo vận đơn nội bộ)
// và các trạng thái trung gian khác để tránh spam hộp thư.
const NOTIFIABLE_STATUSES = ['picked_up', 'delivered', 'failed'];

async function handle(envelope) {
    const { eventType, data } = envelope;

    if (eventType !== 'shipment.status_changed' || !NOTIFIABLE_STATUSES.includes(data.status)) {
        return;
    }

    console.log(`[Notification] Nhận sự kiện '${eventType}' (status=${data.status}) — chuẩn bị gửi email cập nhật vận chuyển cho đơn ${data.orderCode} tới userId=${data.userId}`);
    await notificationService.sendToUserId(data.userId, (contact) => templates.shipmentStatusChanged({
        orderCode: data.orderCode,
        fullName: contact.fullName,
        carrier: data.carrier,
        trackingCode: data.trackingCode,
        status: data.status,
    }));
}

module.exports = { handle };
