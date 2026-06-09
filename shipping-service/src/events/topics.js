module.exports = {
    // Tên topic phải khớp tuyệt đối với hằng số bên Order Service — đây là "hợp đồng" giữa producer và consumer.
    ORDER_EVENTS: 'order-events',

    // Topic do chính Shipping Service phát ra — Order Service subscribe để tự động chuyển đơn
    // sang 'shipped' khi vận đơn được đơn vị vận chuyển lấy hàng, và sang 'completed' khi giao thành công
    // (thay cho việc Admin phải xác nhận thủ công — xem order-service/src/events/shippingEvents.consumer.js).
    SHIPPING_EVENTS: 'shipping-events',
};
