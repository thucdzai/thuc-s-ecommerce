require('dotenv').config();

function required(name) {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
}

module.exports = {
    jwt: {
        // Dùng chung secret với Auth Service để tự ký "system token" khi cần tra cứu email
        // người nhận qua GET /api/users/:id/contact (xem utils/systemToken.js).
        accessSecret: required('JWT_ACCESS_SECRET'),
    },

    kafka: {
        brokers: required('KAFKA_BROKERS').split(',').map((b) => b.trim()),
        clientId: process.env.KAFKA_CLIENT_ID || 'notification-service',
        groupId: process.env.KAFKA_CONSUMER_GROUP_ID || 'notification-service-group',
    },

    authServiceUrl: required('AUTH_SERVICE_URL').replace(/\/+$/, ''),

    mail: {
        username: required('MAIL_USERNAME'),
        password: required('MAIL_PASSWORD'),
        fromName: process.env.MAIL_FROM_NAME || 'TTTN Shop',
    },
};
