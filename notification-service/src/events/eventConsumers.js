const kafka = require('../config/kafka');
const { AUTH_EVENTS, ORDER_EVENTS, PAYMENT_EVENTS, SHIPPING_EVENTS } = require('./topics');
const authEventsConsumer = require('./authEvents.consumer');
const orderEventsConsumer = require('./orderEvents.consumer');
const paymentEventsConsumer = require('./paymentEvents.consumer');
const shippingEventsConsumer = require('./shippingEvents.consumer');

// Bootstrap GỘP cho mọi consumer của Notification Service — chạy trên CÙNG 1 consumer instance
// (xem config/kafka.js#subscribeAndRunMany, cùng pattern Order Service đang dùng) vì cần lắng
// nghe 4 "hợp đồng" khác nhau để lấy dữ liệu gửi email:
//   - AUTH_EVENTS:    'user.registered'        -> email chào mừng
//   - ORDER_EVENTS:   'order.created'           -> email xác nhận đặt hàng
//                     'order.status_changed'    -> email báo hủy / cảm ơn hoàn tất
//   - PAYMENT_EVENTS: 'payment.succeeded'       -> email xác nhận thanh toán
//   - SHIPPING_EVENTS:'shipment.status_changed' -> email cập nhật vận chuyển
async function start() {
    await kafka.connectConsumer();
    await kafka.subscribeAndRunMany({
        [AUTH_EVENTS]: (envelope) => authEventsConsumer.handle(envelope),
        [ORDER_EVENTS]: (envelope) => orderEventsConsumer.handle(envelope),
        [PAYMENT_EVENTS]: (envelope) => paymentEventsConsumer.handle(envelope),
        [SHIPPING_EVENTS]: (envelope) => shippingEventsConsumer.handle(envelope),
    });
    console.log(`[Kafka] Đã subscribe '${AUTH_EVENTS}', '${ORDER_EVENTS}', '${PAYMENT_EVENTS}' và '${SHIPPING_EVENTS}' — sẵn sàng gửi email thông báo theo sự kiện`);
}

async function stop() {
    await kafka.disconnectConsumer();
}

module.exports = { start, stop };
