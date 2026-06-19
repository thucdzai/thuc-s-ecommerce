const app = require('./src/app');
const env = require('./src/config/env');
const kafka = require('./src/config/kafka');
const productEventsConsumer = require('./src/events/productEvents.consumer');
const inventoryService = require('./src/modules/inventory/inventory.service');

const RELEASE_EXPIRED_LOCKS_INTERVAL_MS = 60 * 1000;

async function bootstrap() {
    // Kết nối producer trước (để job nhả-lock-quá-hạn có thể phát 'stock.lock_expired' ngay khi
    // chạy lần đầu), rồi mới kết nối & subscribe consumer — đảm bảo dữ liệu inventory luôn được
    // khởi tạo từ sự kiện sản phẩm trước khi có ai gọi API kiểm tra/giữ chỗ.
    await kafka.connectProducer();
    await productEventsConsumer.start();

    // Vòng lặp nền: cứ mỗi phút quét các lượt giữ chỗ đã quá hạn (15 phút mặc định) mà đơn
    // chưa thanh toán, tự động hoàn lại quantity_available — đúng tinh thần "BE tự xử lý khép kín".
    const releaseExpiredLocksTimer = setInterval(async () => {
        try {
            const releasedCount = await inventoryService.releaseExpiredLocks();
            if (releasedCount > 0) {
                console.log(`[StockLock] Đã tự động nhả ${releasedCount} lượt giữ chỗ quá hạn`);
            }
        } catch (err) {
            console.error('[StockLock] Lỗi khi quét các lượt giữ chỗ quá hạn:', err.message);
        }
    }, RELEASE_EXPIRED_LOCKS_INTERVAL_MS);

    const server = app.listen(env.port, () => {
        console.log(`Warehouse Service đang chạy tại cổng ${env.port}`);
    });

    const shutdown = async (signal) => {
        console.log(`\nNhận tín hiệu ${signal}, đang tắt service...`);
        clearInterval(releaseExpiredLocksTimer);
        server.close();
        await productEventsConsumer.stop();
        await kafka.disconnectProducer();
        process.exit(0);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
}

bootstrap().catch((err) => {
    console.error('Không thể khởi động Warehouse Service:', err);
    process.exit(1);
});
