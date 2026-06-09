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

// Cart Service chỉ CONSUME sự kiện sản phẩm để giữ "bản sao" tên/giá cục bộ phục vụ tính tổng tiền,
// không publish event nào ra ngoài ở phạm vi hiện tại — nên chỉ cần khởi tạo consumer.
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

// Subscribe vào 1 topic và xử lý từng message bằng handler do module gọi truyền vào.
// handler nhận envelope đã parse sẵn — tự lo việc switch theo eventType.
async function subscribeAndRun(topic, handler) {
    await consumer.subscribe({ topic, fromBeginning: true });

    await consumer.run({
        eachMessage: async ({ message }) => {
            if (!message.value) return;

            let envelope;
            try {
                envelope = JSON.parse(message.value.toString());
            } catch (err) {
                console.error(`[Kafka] Bỏ qua message không phải JSON hợp lệ trên topic ${topic}:`, err.message);
                return;
            }

            try {
                await handler(envelope);
            } catch (err) {
                // Không throw lại — tránh consumer bị kẹt lặp vô hạn ở 1 message lỗi.
                console.error(`[Kafka] Xử lý message thất bại (eventType=${envelope?.eventType}):`, err.message);
            }
        },
    });
}

module.exports = { connectConsumer, disconnectConsumer, subscribeAndRun };
