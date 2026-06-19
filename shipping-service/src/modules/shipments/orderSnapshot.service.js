const orderSnapshotRepository = require('./orderSnapshot.repository');
const shipmentService = require('./shipment.service');

// ---------------------------------------------------------------------------
// Đồng bộ "bản sao đọc" đơn hàng từ sự kiện Kafka 'order-events' do Order Service phát ra —
// CÙNG THIẾT KẾ với product_snapshots (Order/Cart) và order_snapshots (Payment): Shipping Service
// không gọi HTTP đồng bộ sang Order Service để biết "đơn này giao cho ai, địa chỉ nào, đang ở
// trạng thái gì" mà giữ một bản sao cục bộ luôn cập nhật theo thời gian thực.
//
// Khác với Payment Service (chỉ cần đọc snapshot khi khách bấm thanh toán), Shipping Service còn
// phải TỰ KÍCH HOẠT việc tạo vận đơn ngay khi phát hiện đơn chuyển sang 'processing' — đây là
// thời điểm "đơn đã thanh toán + đang được đóng gói", đúng lúc cần giao cho đơn vị vận chuyển.
// ---------------------------------------------------------------------------
async function syncFromOrderEvent(envelope) {
    const { eventType, data } = envelope;

    switch (eventType) {
        case 'order.created':
            // Các message 'order.created' phát ra TRƯỚC khi Order Service được cập nhật để đính
            // kèm `recipient` (xem orderEvents.publisher.js) sẽ không có trường này — vì consumer
            // subscribe `fromBeginning: true` nên vẫn có thể đọc lại các message lịch sử đó. Dùng
            // optional chaining + giá trị mặc định để không làm crash toàn bộ luồng đồng bộ.
            await orderSnapshotRepository.upsertSnapshot({
                orderId: data.orderId,
                orderCode: data.orderCode,
                userId: data.userId,
                totalAmount: data.totalAmount,
                itemCount: data.items.reduce((sum, item) => sum + item.quantity, 0),
                status: data.status,
                recipientName: data.recipient?.name || '',
                recipientPhone: data.recipient?.phone || '',
                shippingAddress: data.recipient?.address || '',
            });
            console.log(`[Sync] Đã lưu bản sao đơn hàng ${data.orderCode} (status=${data.status}, người nhận=${data.recipient?.name || '(không rõ)'})`);
            break;

        case 'order.status_changed':
            await orderSnapshotRepository.updateStatusByOrderCode(data.orderCode, data.status);
            console.log(`[Sync] Đã cập nhật trạng thái đơn hàng ${data.orderCode}: ${data.previousStatus} → ${data.status}`);

            // Đơn vừa chuyển sang 'processing' (đã thanh toán, đang đóng gói) — đúng thời điểm
            // tạo vận đơn giao cho đơn vị vận chuyển. Chạy "best-effort": lỗi chỉ log, không
            // throw lại để không làm hỏng việc đồng bộ snapshot (sự kiện gốc đã xử lý xong).
            if (data.status === 'processing') {
                try {
                    await shipmentService.createShipmentForOrder(data.orderCode);
                } catch (err) {
                    console.error(`[Shipping] Không thể tự tạo vận đơn cho đơn ${data.orderCode}:`, err.message);
                }
            }
            break;

        default:
            console.warn(`[Sync] Bỏ qua eventType không xác định: ${eventType}`);
    }
}

module.exports = { syncFromOrderEvent };
