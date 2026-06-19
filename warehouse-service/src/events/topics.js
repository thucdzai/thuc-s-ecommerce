module.exports = {
    // Tên topic phải khớp tuyệt đối với hằng số bên Product Service — đây là "hợp đồng" giữa producer và consumer.
    PRODUCT_EVENTS: 'product-events',

    // Topic do chính Warehouse Service phát ra — Order Service subscribe để TỰ ĐỘNG hủy đơn
    // 'pending_payment' khi lượt giữ chỗ tồn kho của nó quá hạn (xem
    // inventory.service.js#releaseExpiredLocks, events/warehouseEvents.publisher.js, và
    // order-service/src/events/warehouseEvents.consumer.js).
    WAREHOUSE_EVENTS: 'warehouse-events',
};
