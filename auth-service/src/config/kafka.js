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

// Auth Service chỉ PUBLISH sự kiện vòng đời tài khoản (hiện tại: 'user.registered' để Notification
// Service gửi email chào mừng — xem events/authEvents.publisher.js), không cần consume gì —
// nên chỉ khởi tạo producer, giống Product Service.
const producer = kafka.producer();
let producerConnected = false;

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

// Publish một sự kiện lên topic — bọc trong "envelope" chuẩn giống các service khác,
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

module.exports = { connectProducer, disconnectProducer, publishEvent };
