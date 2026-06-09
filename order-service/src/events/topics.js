module.exports = {
    // Tên topic phải khớp tuyệt đối với hằng số bên Product Service — đây là "hợp đồng" giữa producer và consumer.
    PRODUCT_EVENTS: 'product-events',

    // Topic do chính Order Service phát ra — Payment/Shipping/Warehouse Service sẽ subscribe
    // ở các giai đoạn xây dựng tiếp theo (vd: Payment tạo giao dịch khi nhận 'order.created',
    // Shipping tạo vận đơn khi đơn chuyển 'processing'...). Khai báo trước để giữ "hợp đồng" ổn định.
    ORDER_EVENTS: 'order-events',

    // Topic do Payment Service phát ra sau khi xác nhận kết quả giao dịch VNPay qua IPN — Order
    // Service subscribe để TỰ ĐỘNG chuyển đơn 'pending_payment' → 'paid' (thay vì chờ Admin xác nhận
    // thủ công, xem ghi chú TẠM THỜI trong order.service.js#updateOrderStatusByAdmin).
    PAYMENT_EVENTS: 'payment-events',

    // Topic do Shipping Service phát ra theo vòng đời vận đơn — Order Service subscribe để TỰ ĐỘNG
    // chuyển đơn 'processing' → 'shipped' (khi đơn vị vận chuyển lấy hàng) và 'shipped' → 'completed'
    // (khi giao thành công), xem events/shippingEvents.consumer.js.
    SHIPPING_EVENTS: 'shipping-events',

    // Topic do Warehouse Service phát ra khi lượt giữ chỗ tồn kho quá hạn (mặc định 15 phút) bị tự
    // động nhả — Order Service subscribe để TỰ ĐỘNG hủy đơn 'pending_payment' tương ứng, tránh đơn
    // "treo" vô thời hạn và tránh khách thanh toán lại cho đơn mà tồn kho đã trả về cho người khác
    // (xem events/warehouseEvents.consumer.js).
    WAREHOUSE_EVENTS: 'warehouse-events',
};
