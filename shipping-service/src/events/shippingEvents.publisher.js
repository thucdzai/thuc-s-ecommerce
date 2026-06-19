const kafka = require('../config/kafka');
const { SHIPPING_EVENTS } = require('./topics');

// Phát vòng đời vận đơn lên Kafka — Order Service lắng nghe để TỰ ĐỘNG chuyển đơn:
//   'picked_up' (đơn vị vận chuyển đã lấy hàng)  -> đơn 'processing' → 'shipped'
//   'delivered' (đã giao thành công tới khách)   -> đơn 'shipped'    → 'completed'
// thay cho việc Admin phải xác nhận thủ công từng bước — cùng triết lý "giảm coupling" mà
// Payment Service đã áp dụng cho payment-events (Shipping Service không gọi ngược API Order Service).

async function publishShipmentCreated(shipment) {
    await kafka.publishEvent(SHIPPING_EVENTS, 'shipment.created', {
        shipmentId: shipment.id,
        orderId: shipment.orderId,
        orderCode: shipment.orderCode,
        userId: shipment.userId,
        carrier: shipment.carrier,
        trackingCode: shipment.trackingCode,
        fee: shipment.fee,
        status: shipment.status,
    }, shipment.orderCode);
}

async function publishShipmentStatusChanged(shipment, previousStatus) {
    await kafka.publishEvent(SHIPPING_EVENTS, 'shipment.status_changed', {
        shipmentId: shipment.id,
        orderId: shipment.orderId,
        orderCode: shipment.orderCode,
        userId: shipment.userId,
        carrier: shipment.carrier,
        trackingCode: shipment.trackingCode,
        previousStatus,
        status: shipment.status,
    }, shipment.orderCode);
}

module.exports = { publishShipmentCreated, publishShipmentStatusChanged };
