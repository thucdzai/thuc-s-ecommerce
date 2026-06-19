const Joi = require('joi');

const PAYMENT_STATUSES = ['pending', 'success', 'failed', 'cancelled'];

const idParam = Joi.object({
    id: Joi.number().integer().positive().required(),
});

const orderCodeParam = Joi.object({
    orderCode: Joi.string().trim().uppercase().min(4).max(32).required(),
});

// Khách chỉ cần gửi orderCode — Payment Service tự tra số tiền/chủ đơn từ order_snapshots
// (đồng bộ qua Kafka), KHÔNG nhận amount từ FE để tránh khách tự ý đổi số tiền thanh toán.
const createUrlBody = Joi.object({
    orderCode: Joi.string().trim().uppercase().min(4).max(32).required(),
});

const myPaymentsQuery = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    status: Joi.string().valid(...PAYMENT_STATUSES),
});

const adminPaymentsQuery = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    status: Joi.string().valid(...PAYMENT_STATUSES),
    orderCode: Joi.string().trim().uppercase().max(32),
    userId: Joi.number().integer().positive(),
});

module.exports = { PAYMENT_STATUSES, idParam, orderCodeParam, createUrlBody, myPaymentsQuery, adminPaymentsQuery };
