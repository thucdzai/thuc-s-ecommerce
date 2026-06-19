const kafka = require('../config/kafka');
const { PRODUCT_EVENTS, PAYMENT_EVENTS, SHIPPING_EVENTS, WAREHOUSE_EVENTS } = require('./topics');
const productSnapshotService = require('../modules/orders/productSnapshot.service');
const paymentEventsConsumer = require('./paymentEvents.consumer');
const shippingEventsConsumer = require('./shippingEvents.consumer');
const warehouseEventsConsumer = require('./warehouseEvents.consumer');

// Bootstrap GỘP cho mọi consumer của Order Service — chạy trên CÙNG 1 consumer instance
// (xem kafka.js#subscribeAndRunMany) vì Order Service giờ cần lắng nghe 4 "hợp đồng" khác nhau:
//   - PRODUCT_EVENTS: đồng bộ bản sao tên/giá sản phẩm phục vụ chốt đơn (đã có từ đầu)
//   - PAYMENT_EVENTS: nhận kết quả thanh toán từ Payment Service để tự động chuyển đơn 'paid'
//   - SHIPPING_EVENTS: nhận vòng đời vận đơn từ Shipping Service để tự động chuyển đơn
//     'processing' → 'shipped' → 'completed'
//   - WAREHOUSE_EVENTS: nhận tin lượt giữ chỗ tồn kho quá hạn để tự động hủy đơn 'pending_payment'
async function start() {
    await kafka.connectConsumer();
    await kafka.subscribeAndRunMany({
        [PRODUCT_EVENTS]: (envelope) => productSnapshotService.syncFromProductEvent(envelope),
        [PAYMENT_EVENTS]: (envelope) => paymentEventsConsumer.handle(envelope),
        [SHIPPING_EVENTS]: (envelope) => shippingEventsConsumer.handle(envelope),
        [WAREHOUSE_EVENTS]: (envelope) => warehouseEventsConsumer.handle(envelope),
    });
    console.log(`[Kafka] Đã subscribe '${PRODUCT_EVENTS}', '${PAYMENT_EVENTS}', '${SHIPPING_EVENTS}' và '${WAREHOUSE_EVENTS}' — sẵn sàng đồng bộ snapshot & nhận kết quả thanh toán/vận chuyển/tồn kho`);
}

async function stop() {
    await kafka.disconnectConsumer();
}

module.exports = { start, stop };
