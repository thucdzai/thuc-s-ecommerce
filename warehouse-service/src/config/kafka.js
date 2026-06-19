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

// Warehouse Service vừa CONSUME sự kiện sản phẩm, vừa giờ đây PUBLISH sự kiện 'stock.lock_expired'
// khi tự động nhả lượt giữ chỗ quá hạn (xem inventory.service.js#releaseExpiredLocks và
// events/warehouseEvents.publisher.js) để Order Service tự hủy đơn 'pending_payment' tương ứng —
// nên cần khởi tạo cả producer lẫn consumer, giống Order Service.
const producer = kafka.producer();
const consumer = kafka.consumer({ groupId: env.kafka.groupId });
let producerConnected = false;
let consumerConnected = false;

async function connectProducer() {
    if (producerConnected) return;
    await producer.connect();
    producerConnected = true;
    console.log('[Kafka] Producer đã kết nối tới broker:', env.kafka.brokers.join(','));
}

async function disconnectProducer() {
    if (!producerConnected) return;
    await producer.disconnect();
    producerConnected = false;
}

async function connectConsumer() {
    if (consumerConnected) return;
    await consumer.connect();
    consumerConnected = true;
    console.log('[Kafka] Consumer đã kết nối tới broker:', env.kafka.brokers.join(','), '— group:', env.kafka.groupId);
}

async function disconnectConsumer() {
    if (!consumerConnected) return;
    await consumer.disconnect();
    consumerConnected = false;
}

// Publish một sự kiện lên topic — bọc trong "envelope" chuẩn giống Order/Product Service,
// để mọi consumer trong hệ thống đọc cùng 1 định dạng (eventType/occurredAt/source/data).
async function publishEvent(topic, eventType, payload, key = null) {
    const envelope = {
        eventType,
        occurredAt: new Date().toISOString(),
        source: env.kafka.clientId,
        data: payload,
    };

    await producer.send({
        topic,
        messages: [{ key: key !== null ? String(key) : null, value: JSON.stringify(envelope) }],
    });
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
                // Trong hệ thống thực tế nên đẩy sang Dead Letter Queue, ở đây log để dễ truy vết khi demo.
                console.error(`[Kafka] Xử lý message thất bại (eventType=${envelope?.eventType}):`, err.message);
            }
        },
    });
}

module.exports = { connectProducer, disconnectProducer, connectConsumer, disconnectConsumer, publishEvent, subscribeAndRun };
