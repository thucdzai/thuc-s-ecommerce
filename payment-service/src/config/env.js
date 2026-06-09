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
        // Dùng chung secret với Auth Service để verify token — Payment Service không phát hành token
        // cho người dùng (chỉ Order Service tự ký token hệ thống bằng CHÍNH secret này khi gọi nội bộ).
        accessSecret: required('JWT_ACCESS_SECRET'),
    },

    kafka: {
        brokers: required('KAFKA_BROKERS').split(',').map((b) => b.trim()),
        clientId: process.env.KAFKA_CLIENT_ID || 'payment-service',
        groupId: process.env.KAFKA_CONSUMER_GROUP_ID || 'payment-service-group',
    },

    vnpay: {
        tmnCode: required('VNPAY_TMN_CODE'),
        hashSecret: required('VNPAY_HASH_SECRET'),
        payUrl: required('VNPAY_PAY_URL'),
        returnUrl: required('VNPAY_RETURN_URL'),
    },
};
