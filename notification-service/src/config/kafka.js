// Tắt cảnh báo về default partitioner mới của KafkaJS v2 — dự án mới nên dùng mặc định mới, không cần legacy.
process.env.KAFKAJS_NO_PARTITIONER_WARNING = '1';

const { Kafka, logLevel } = require('kafkajs');
const env = require('./env');

const kafka = new Kafka({
    clientId: env.kafka.clientId,
    brokers: env.kafka.brokers,
    logLevel: logLevel.WARN,
    retry: { initialRetryTime: 300, retries: 5 },
});

// Notification Service chỉ CONSUME sự kiện từ các service khác để lấy dữ liệu gửi email
// (đăng ký, đơn hàng, thanh toán, vận chuyển) — không publish event nào ra ngoài, nên chỉ
// cần khởi tạo consumer, giống Cart/Warehouse Service.
const consumer = kafka.consumer({ groupId: env.kafka.groupId });
let isConnected = false;

async function connectConsumer() {
    if (isConnected) return;
    await consumer.connect();
    isConnected = true;
    console.log('[Kafka] Consumer đã kết nối tới broker:', env.kafka.brokers.join(','), '— group:', env.kafka.groupId);
}

async function disconnectConsumer() {
    if (!isConnected) return;
    await consumer.disconnect();
    isConnected = false;
}

// Subscribe vào NHIỀU topic cùng lúc trên 1 consumer instance rồi chạy chung 1 vòng lặp —
// Notification Service cần lắng nghe 4 "hợp đồng" khác nhau (auth-events, order-events,
// payment-events, shipping-events), giống cách Order Service làm với subscribeAndRunMany.
async function subscribeAndRunMany(topicHandlers) {
    for (const topic of Object.keys(topicHandlers)) {
        await consumer.subscribe({ topic, fromBeginning: true });
    }

    await consumer.run({
        eachMessage: async ({ topic, message }) => {
            if (!message.value) return;

            let envelope;
            try {
                envelope = JSON.parse(message.value.toString());
            } catch (err) {
                console.error(`[Kafka] Bỏ qua message không phải JSON hợp lệ trên topic ${topic}:`, err.message);
                return;
            }

            try {
                await topicHandlers[topic](envelope);
            } catch (err) {
                // Không throw lại — tránh consumer bị kẹt lặp vô hạn ở 1 message lỗi (vd: gửi mail thất bại tạm thời).
                console.error(`[Kafka] Xử lý message thất bại (topic=${topic}, eventType=${envelope?.eventType}):`, err.message);
            }
        },
    });
}

module.exports = { connectConsumer, disconnectConsumer, subscribeAndRunMany };
