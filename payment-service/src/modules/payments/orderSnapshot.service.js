const orderSnapshotRepository = require('./orderSnapshot.repository');

// ---------------------------------------------------------------------------
// Đồng bộ "bản sao đọc" đơn hàng từ sự kiện Kafka 'order-events' do Order Service phát ra —
// CÙNG THIẾT KẾ với product_snapshots bên Order/Cart Service: Payment Service không gọi HTTP
// đồng bộ sang Order Service để biết "đơn này của ai, tổng tiền bao nhiêu, đang ở trạng thái gì"
// mà giữ một bản sao cục bộ luôn cập nhật theo thời gian thực — vừa giảm coupling, vừa tránh
// phải xác thực/forward token của khách khi tạo URL thanh toán.
// ---------------------------------------------------------------------------
async function syncFromOrderEvent(envelope) {
    const { eventType, data } = envelope;

    switch (eventType) {
        case 'order.created':
            await orderSnapshotRepository.upsertSnapshot({
                orderId: data.orderId,
                orderCode: data.orderCode,
                userId: data.userId,
                totalAmount: data.totalAmount,
                status: data.status,
            });
            console.log(`[Sync] Đã lưu bản sao đơn hàng ${data.orderCode} (status=${data.status}, total=${data.totalAmount})`);
            break;

        case 'order.status_changed':
            await orderSnapshotRepository.updateStatusByOrderCode(data.orderCode, data.status);
            console.log(`[Sync] Đã cập nhật trạng thái đơn hàng ${data.orderCode}: ${data.previousStatus} → ${data.status}`);
            break;

        default:
            console.warn(`[Sync] Bỏ qua eventType không xác định: ${eventType}`);
    }
}

module.exports = { syncFromOrderEvent };
