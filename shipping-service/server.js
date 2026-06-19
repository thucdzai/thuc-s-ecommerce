const app = require('./src/app');
const env = require('./src/config/env');
const kafka = require('./src/config/kafka');
const redis = require('./src/config/redis');
const orderEventsConsumer = require('./src/events/orderEvents.consumer');

async function bootstrap() {
    // Kết nối producer trước (để publish 'shipment.created/status_changed' ngay khi vận đơn đầu tiên
    // được tạo), rồi mới kết nối & subscribe consumer (để order_snapshots luôn sẵn sàng trước khi
    // có sự kiện 'order.status_changed' đầu tiên cần xử lý) — cùng thứ tự khởi động với Payment Service.
    await kafka.connectProducer();
    await redis.connect();
    await orderEventsConsumer.start();

    const server = app.listen(env.port, () => {
        console.log(`Shipping Service đang chạy tại cổng ${env.port}`);
    });

    const shutdown = async (signal) => {
        console.log(`\nNhận tín hiệu ${signal}, đang tắt service...`);
        server.close();
        await orderEventsConsumer.stop();
        await kafka.disconnectProducer();
        await redis.disconnect();
        process.exit(0);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
}

bootstrap().catch((err) => {
    console.error('Không thể khởi động Shipping Service:', err);
    process.exit(1);
});
