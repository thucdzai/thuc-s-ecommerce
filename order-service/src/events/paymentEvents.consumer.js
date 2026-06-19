const orderService = require('../modules/orders/order.service');

// Lắng nghe kết quả thanh toán từ Payment Service ('payment-events') để TỰ ĐỘNG chuyển đơn
// 'pending_payment' → 'paid' khi VNPay xác nhận giao dịch thành công qua IPN — đây là đường đi
// CHUẨN LÂU DÀI thay cho việc Admin phải bấm xác nhận thủ công (xem ghi chú TẠM THỜI trong
// order.service.js#updateOrderStatusByAdmin, để giữ luồng đặt-hàng→giao-hàng chạy được trước
// khi Payment Service ra đời).
async function handle(envelope) {
    const { eventType, data } = envelope;

    switch (eventType) {
        case 'payment.succeeded':
            await orderService.markOrderPaidFromPayment(data.orderCode);
            break;

        case 'payment.failed':
            // Khách có thể bấm "Thanh toán lại" để tạo giao dịch mới cho cùng 1 đơn — KHÔNG tự động
            // hủy đơn chỉ vì 1 lần thử thất bại (vd: khách hủy giữa chừng, thẻ bị từ chối tạm thời).
            console.warn(`[Payment] Giao dịch thất bại cho đơn ${data.orderCode} (lý do: ${data.reason}) — chờ khách thử lại, không tự động hủy đơn`);
            break;

        default:
            console.warn(`[Payment] Bỏ qua eventType không xác định: ${eventType}`);
    }
}

module.exports = { handle };
