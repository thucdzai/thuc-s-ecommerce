const kafka = require('../config/kafka');
const { ORDER_EVENTS } = require('./topics');
const orderSnapshotService = require('../modules/payments/orderSnapshot.service');

// Lắng nghe vòng đời đơn hàng từ Order Service để giữ bản sao đọc cục bộ (order_snapshots) —
// Payment Service dùng bản sao này để biết đơn nào đang chờ thanh toán, của ai, tổng tiền
// bao nhiêu khi tạo URL VNPay (xem orderSnapshot.service.js để biết lý do không gọi HTTP đồng bộ).
async function start() {
    await kafka.connectConsumer();
    await kafka.subscribeAndRun(ORDER_EVENTS, (envelope) => orderSnapshotService.syncFromOrderEvent(envelope));
    console.log(`[Kafka] Đã subscribe topic '${ORDER_EVENTS}' — sẵn sàng đồng bộ bản sao đơn hàng`);
}

async function stop() {
    await kafka.disconnectConsumer();
}

module.exports = { start, stop };
