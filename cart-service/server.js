const app = require('./src/app');
const env = require('./src/config/env');
const productEventsConsumer = require('./src/events/productEvents.consumer');

async function bootstrap() {
    // Kết nối & subscribe Kafka consumer trước khi nhận request — đảm bảo product_snapshots
    // luôn được khởi tạo từ sự kiện sản phẩm trước khi có ai gọi API giỏ hàng.
    await productEventsConsumer.start();

    const server = app.listen(env.port, () => {
        console.log(`Cart Service đang chạy tại cổng ${env.port}`);
    });

    const shutdown = async (signal) => {
        console.log(`\nNhận tín hiệu ${signal}, đang tắt service...`);
        server.close();
        await productEventsConsumer.stop();
        process.exit(0);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
}

bootstrap().catch((err) => {
    console.error('Không thể khởi động Cart Service:', err);
    process.exit(1);
});
