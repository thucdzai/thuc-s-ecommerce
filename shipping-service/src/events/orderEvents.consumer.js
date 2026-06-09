const kafka = require('../config/kafka');
const { ORDER_EVENTS } = require('./topics');
const orderSnapshotService = require('../modules/shipments/orderSnapshot.service');

// Lắng nghe vòng đời đơn hàng từ Order Service để giữ bản sao đọc cục bộ (order_snapshots) —
// Shipping Service dùng bản sao này để biết đơn nào cần giao, giao cho ai, địa chỉ nào, và
// TỰ ĐỘNG tạo vận đơn ngay khi đơn chuyển sang 'processing' (xem orderSnapshot.service.js).
async function start() {
    await kafka.connectConsumer();
    await kafka.subscribeAndRun(ORDER_EVENTS, (envelope) => orderSnapshotService.syncFromOrderEvent(envelope));
    console.log(`[Kafka] Đã subscribe topic '${ORDER_EVENTS}' — sẵn sàng đồng bộ bản sao đơn hàng & tự tạo vận đơn`);
}

async function stop() {
    await kafka.disconnectConsumer();
}

module.exports = { start, stop };
