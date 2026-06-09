const orderService = require('../modules/orders/order.service');

// Lắng nghe vòng đời vận đơn từ Shipping Service ('shipping-events') để TỰ ĐỘNG chuyển đơn:
//   'picked_up' (đơn vị vận chuyển đã lấy hàng) -> đơn 'processing' → 'shipped'
//   'delivered' (đã giao thành công tới khách)  -> đơn 'shipped'    → 'completed'
// đây là đường đi CHUẨN LÂU DÀI thay cho việc Admin phải bấm xác nhận thủ công từng bước
// (cùng triết lý với payment-events.consumer.js#markOrderPaidFromPayment).
async function handle(envelope) {
    const { eventType, data } = envelope;

    if (eventType !== 'shipment.status_changed') {
        if (eventType !== 'shipment.created') {
            console.warn(`[Shipping] Bỏ qua eventType không xác định: ${eventType}`);
        }
        return;
    }

    switch (data.status) {
        case 'picked_up':
            await orderService.markOrderShippedFromShipping(data.orderCode);
            break;

        case 'delivered':
            await orderService.markOrderCompletedFromShipping(data.orderCode);
            break;

        case 'failed':
        case 'returned':
            // Giao thất bại/hoàn hàng — KHÔNG tự động đổi trạng thái đơn (đơn vẫn đang
            // 'processing'/'shipped'), cần Admin can thiệp thủ công (liên hệ khách, tạo lại vận đơn...).
            console.warn(`[Shipping] Vận đơn của đơn ${data.orderCode} ở trạng thái "${data.status}" — cần Admin can thiệp thủ công`);
            break;

        default:
            // 'pending', 'in_transit'... chỉ là các bước trung gian, không ứng với bước chuyển nào
            // trong máy trạng thái đơn hàng — không cần hành động.
            break;
    }
}

module.exports = { handle };
