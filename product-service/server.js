const app = require('./src/app');
const env = require('./src/config/env');
const kafka = require('./src/config/kafka');
const redis = require('./src/config/redis');

async function bootstrap() {
    // Kết nối Kafka producer trước khi nhận request — đảm bảo lần publish event đầu tiên không bị lỗi.
    await kafka.connectProducer();
    await redis.connect();

    const server = app.listen(env.port, () => {
        console.log(`Product Service đang chạy tại cổng ${env.port}`);
    });

    const shutdown = async (signal) => {
        console.log(`\nNhận tín hiệu ${signal}, đang tắt service...`);
        server.close();
        await kafka.disconnectProducer();
        await redis.disconnect();
        process.exit(0);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
}

bootstrap().catch((err) => {
    console.error('Không thể khởi động Product Service:', err);
    process.exit(1);
});
