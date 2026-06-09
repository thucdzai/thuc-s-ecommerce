const templates = require('../notifications/emailTemplates');
const notificationService = require('../notifications/notification.service');

// Chỉ phản ứng với 'order.created' (xác nhận đặt hàng) và 2 trạng thái đáng thông báo nhất của
// 'order.status_changed' — 'cancelled' (hủy đơn) và 'completed' (hoàn tất, lời cảm ơn).
// Cố tình BỎ QUA 'paid'/'processing'/'shipped' ở đây để tránh trùng lặp với email riêng từ
// payment.succeeded (paymentEvents.consumer.js) và shipment.status_changed (shippingEvents.consumer.js).
async function handle(envelope) {
    const { eventType, data } = envelope;

    if (eventType === 'order.created') {
        console.log(`[Notification] Nhận sự kiện '${eventType}' — chuẩn bị gửi email xác nhận đơn hàng ${data.orderCode} tới userId=${data.userId}`);
        await notificationService.sendToUserId(data.userId, () => templates.orderCreated({
            orderCode: data.orderCode,
            totalAmount: data.totalAmount,
            recipientName: data.recipient?.name,
        }));
        return;
    }

    if (eventType === 'order.status_changed') {
        if (data.status === 'cancelled') {
            console.log(`[Notification] Nhận sự kiện '${eventType}' (cancelled) — chuẩn bị gửi email báo hủy đơn ${data.orderCode} tới userId=${data.userId}`);
            await notificationService.sendToUserId(data.userId, (contact) => templates.orderCancelled({
                orderCode: data.orderCode,
                fullName: contact.fullName,
            }));
            return;
        }

        if (data.status === 'completed') {
            console.log(`[Notification] Nhận sự kiện '${eventType}' (completed) — chuẩn bị gửi email cảm ơn cho đơn ${data.orderCode} tới userId=${data.userId}`);
            await notificationService.sendToUserId(data.userId, (contact) => templates.orderCompleted({
                orderCode: data.orderCode,
                fullName: contact.fullName,
            }));
        }
    }
}

module.exports = { handle };
