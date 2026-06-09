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

const producer = kafka.producer();
let isConnected = false;

// Kết nối producer một lần khi service khởi động — tái sử dụng cho mọi lần publish event sau đó.
async function connectProducer() {
    if (isConnected) return;
    await producer.connect();
    isConnected = true;
    console.log('[Kafka] Producer đã kết nối tới broker:', env.kafka.brokers.join(','));
}

async function disconnectProducer() {
    if (!isConnected) return;
    await producer.disconnect();
    isConnected = false;
}

// Publish một sự kiện lên topic — message được bọc trong "envelope" chuẩn để consumer
// luôn biết: loại sự kiện gì, phát sinh từ đâu, vào lúc nào, dữ liệu kèm theo là gì.
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
