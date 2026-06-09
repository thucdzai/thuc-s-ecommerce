const kafka = require('../config/kafka');
const { PRODUCT_EVENTS } = require('./topics');
const inventoryService = require('../modules/inventory/inventory.service');

// Lắng nghe mọi thay đổi sản phẩm từ Product Service để tự đồng bộ danh mục SKU trong kho —
// Warehouse Service không cần (và không nên) gọi đồng bộ sang Product Service mỗi khi cần biết
// "SKU này có tồn tại không", giảm coupling và tải đọc giữa các service.
async function start() {
    await kafka.connectConsumer();
    await kafka.subscribeAndRun(PRODUCT_EVENTS, (envelope) => inventoryService.syncFromProductEvent(envelope));
    console.log(`[Kafka] Đã subscribe topic '${PRODUCT_EVENTS}' — sẵn sàng đồng bộ tồn kho theo sự kiện sản phẩm`);
}

async function stop() {
    await kafka.disconnectConsumer();
}

module.exports = { start, stop };
