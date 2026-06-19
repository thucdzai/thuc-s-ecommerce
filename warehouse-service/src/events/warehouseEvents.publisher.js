const kafka = require('../config/kafka');
const { WAREHOUSE_EVENTS } = require('./topics');

// Phát sự kiện vòng đời tồn kho lên Kafka — hiện chỉ có 'stock.lock_expired' khi lượt giữ chỗ
// quá hạn bị tự động nhả (xem inventory.service.js#releaseExpiredLocks). Order Service lắng nghe
// để tự hủy đơn 'pending_payment' tương ứng, theo đúng triết lý "giảm coupling" mà các sự kiện
// khác trong hệ thống đã áp dụng — Warehouse Service không cần biết hay gọi trực tiếp sang Order.
async function publishStockLockExpired({ orderCode, skuId, quantity }) {
    await kafka.publishEvent(WAREHOUSE_EVENTS, 'stock.lock_expired', { orderCode, skuId, quantity }, orderCode);
}

module.exports = { publishStockLockExpired };
