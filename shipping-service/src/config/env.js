require('dotenv').config();

function required(name) {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
}

module.exports = {
    port: Number(process.env.PORT || 3001),

    db: {
        host: required('DB_HOST'),
        user: required('DB_USER'),
        password: process.env.DB_PASSWORD || '',
        database: required('DB_NAME'),
        port: Number(process.env.DB_PORT || 3306),
    },

    jwt: {
        // Dùng chung secret với Auth Service để verify token — Shipping Service không phát hành token
        // cho người dùng (chỉ Order Service tự ký token hệ thống bằng CHÍNH secret này khi gọi nội bộ).
        accessSecret: required('JWT_ACCESS_SECRET'),
    },

    kafka: {
        brokers: required('KAFKA_BROKERS').split(',').map((b) => b.trim()),
        clientId: process.env.KAFKA_CLIENT_ID || 'shipping-service',
        groupId: process.env.KAFKA_CONSUMER_GROUP_ID || 'shipping-service-group',
    },

    shipping: {
        baseFee: Number(process.env.SHIPPING_BASE_FEE || 16500),
        innerZoneKeywords: (process.env.SHIPPING_INNER_ZONE_KEYWORDS || '')
            .split(',')
            .map((s) => s.trim().toLowerCase())
            .filter(Boolean),
    },

    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: Number(process.env.REDIS_PORT || 6379),
    },
};
