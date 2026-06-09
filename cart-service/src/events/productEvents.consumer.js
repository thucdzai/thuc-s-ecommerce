const kafka = require('../config/kafka');
const { PRODUCT_EVENTS } = require('./topics');
const cartService = require('../modules/cart/cart.service');

// Lắng nghe mọi thay đổi sản phẩm từ Product Service để giữ một "bản sao" cục bộ tên/giá
// (product_snapshots) — nhờ vậy GET /cart tính lineTotal/cartTotal ngay tại Cart Service mà
// không cần gọi HTTP đồng bộ sang Product Service mỗi lần khách mở giỏ hàng (giảm coupling, giảm độ trễ).
async function start() {
    await kafka.connectConsumer();
    await kafka.subscribeAndRun(PRODUCT_EVENTS, (envelope) => cartService.syncFromProductEvent(envelope));
    console.log(`[Kafka] Đã subscribe topic '${PRODUCT_EVENTS}' — sẵn sàng đồng bộ snapshot sản phẩm cho giỏ hàng`);
}

async function stop() {
    await kafka.disconnectConsumer();
}

module.exports = { start, stop };
