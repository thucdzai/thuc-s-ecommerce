const orderService = require('../modules/orders/order.service');

// Lắng nghe sự kiện vòng đời tồn kho từ Warehouse Service ('warehouse-events') để TỰ ĐỘNG hủy
// đơn 'pending_payment' khi lượt giữ chỗ của nó đã quá hạn (mặc định 15 phút) và bị tự động nhả —
// xem order.service.js#markOrderCancelledFromPaymentTimeout.
async function handle(envelope) {
    const { eventType, data } = envelope;

    switch (eventType) {
        case 'stock.lock_expired':
            await orderService.markOrderCancelledFromPaymentTimeout(data.orderCode);
            break;

        default:
            console.warn(`[Warehouse] Bỏ qua eventType không xác định: ${eventType}`);
    }
}

module.exports = { handle };
