const app = require('./src/app');
const env = require('./src/config/env');
const kafka = require('./src/config/kafka');
const orderEventsConsumer = require('./src/events/orderEvents.consumer');

async function bootstrap() {
    // Kết nối producer trước (để publish 'payment.succeeded/failed' ngay khi IPN đầu tiên tới),
    // rồi mới kết nối & subscribe consumer (để order_snapshots luôn sẵn sàng trước khi nhận
    // request tạo URL thanh toán) — cùng thứ tự khởi động với Order Service.
    await kafka.connectProducer();
    await orderEventsConsumer.start();

    const server = app.listen(env.port, () => {
        console.log(`Payment Service đang chạy tại cổng ${env.port}`);
    });

    const shutdown = async (signal) => {
        console.log(`\nNhận tín hiệu ${signal}, đang tắt service...`);
        server.close();
        await orderEventsConsumer.stop();
        await kafka.disconnectProducer();
        process.exit(0);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
}

bootstrap().catch((err) => {
    console.error('Không thể khởi động Payment Service:', err);
    process.exit(1);
});
