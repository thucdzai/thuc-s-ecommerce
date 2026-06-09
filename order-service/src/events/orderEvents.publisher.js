const kafka = require('../config/kafka');
const { ORDER_EVENTS } = require('./topics');

// Phát sự kiện vòng đời đơn hàng lên Kafka — các service khác (Payment, Shipping, Warehouse...)
// tự lắng nghe và phản ứng, Order Service không cần biết hay gọi trực tiếp tới từng service đó
// (cùng triết lý "giảm coupling" mà Product Service đã áp dụng cho product-events).

async function publishOrderCreated(order) {
    await kafka.publishEvent(ORDER_EVENTS, 'order.created', {
        orderId: order.id,
        orderCode: order.orderCode,
        userId: order.userId,
        status: order.status,
        totalAmount: order.totalAmount,
        // Shipping Service cần thông tin người nhận để tự tạo vận đơn khi đơn chuyển sang
        // 'processing' (xem shipping-service/src/modules/shipments/orderSnapshot.service.js) —
        // Payment Service không dùng tới nhưng việc thêm vào đây không phá vỡ consumer cũ.
        recipient: {
            name: order.recipient.name,
            phone: order.recipient.phone,
            address: order.recipient.address,
        },
        items: order.items.map((item) => ({ skuId: item.skuId, quantity: item.quantity })),
    }, order.orderCode);
}

async function publishOrderStatusChanged(order, previousStatus) {
    await kafka.publishEvent(ORDER_EVENTS, 'order.status_changed', {
        orderId: order.id,
        orderCode: order.orderCode,
        userId: order.userId,
        previousStatus,
        status: order.status,
    }, order.orderCode);
}

module.exports = { publishOrderCreated, publishOrderStatusChanged };
