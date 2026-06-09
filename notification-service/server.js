const eventConsumers = require('./src/events/eventConsumers');

// Notification Service không có DB lẫn REST API — chỉ là một tiến trình lắng nghe Kafka và gửi
// email, nên không cần khởi tạo Express server, chỉ cần khởi động consumer rồi giữ tiến trình sống.
async function bootstrap() {
    await eventConsumers.start();
    console.log('Notification Service đã sẵn sàng — đang lắng nghe sự kiện để gửi email thông báo');

    const shutdown = async (signal) => {
        console.log(`\nNhận tín hiệu ${signal}, đang tắt service...`);
        await eventConsumers.stop();
        process.exit(0);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
}

bootstrap().catch((err) => {
    console.error('Không thể khởi động Notification Service:', err);
    process.exit(1);
});
