const app = require('./src/app');
const env = require('./src/config/env');
const redis = require('./src/config/redis');
const kafka = require('./src/config/kafka');

async function bootstrap() {
    await redis.connect();
    await kafka.connectProducer();

    const server = app.listen(env.port, () => {
        console.log(`Auth Service đang chạy tại cổng ${env.port}`);
    });

    const shutdown = async (signal) => {
        console.log(`\nNhận tín hiệu ${signal}, đang tắt service...`);
        server.close();
        await redis.disconnect();
        await kafka.disconnectProducer();
        process.exit(0);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
}

bootstrap().catch((err) => {
    console.error('Không thể khởi động Auth Service:', err);
    process.exit(1);
});
