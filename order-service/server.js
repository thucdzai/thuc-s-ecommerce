const app = require('./src/app');
const env = require('./src/config/env');
const kafka = require('./src/config/kafka');
const eventConsumers = require('./src/events/eventConsumers');

async function bootstrap() {
    // Kết nối producer trước (để publish 'order.created' ngay từ đơn đầu tiên), rồi mới
    // kết nối & subscribe consumer (để product_snapshots luôn sẵn sàng trước khi nhận request checkout).
    await kafka.connectProducer();
    await eventConsumers.start();

    const server = app.listen(env.port, () => {
        console.log(`Order Service đang chạy tại cổng ${env.port}`);
    });

    const shutdown = async (signal) => {
        console.log(`\nNhận tín hiệu ${signal}, đang tắt service...`);
        server.close();
        await eventConsumers.stop();
        await kafka.disconnectProducer();
        process.exit(0);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
}

bootstrap().catch((err) => {
    console.error('Không thể khởi động Order Service:', err);
    process.exit(1);
});
