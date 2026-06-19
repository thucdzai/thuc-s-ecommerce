module.exports = {
    // Tên topic phải khớp tuyệt đối với hằng số bên Order Service — đây là "hợp đồng" giữa producer và consumer.
    ORDER_EVENTS: 'order-events',

    // Topic do chính Payment Service phát ra — Order Service subscribe để tự động chuyển đơn
    // sang trạng thái 'paid' khi VNPay xác nhận giao dịch thành công qua IPN (thay cho việc
    // Admin phải xác nhận thủ công — xem order-service/src/events/paymentEvents.consumer.js).
    PAYMENT_EVENTS: 'payment-events',
};
