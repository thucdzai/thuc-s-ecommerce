const Joi = require('joi');

const ORDER_STATUSES = ['pending_payment', 'paid', 'processing', 'shipped', 'completed', 'cancelled'];

const idParam = Joi.object({
    id: Joi.number().integer().positive().required(),
});

// Mỗi dòng chỉ cần skuId + quantity — Order Service tự tra giá/tên từ product_snapshots,
// FE KHÔNG được gửi kèm price/name (nếu có sẽ bị `stripUnknown` loại bỏ ở middleware validate).
const checkoutItem = Joi.object({
    skuId: Joi.number().integer().positive().required(),
    quantity: Joi.number().integer().positive().max(999).required(),
});

const checkoutBody = Joi.object({
    items: Joi.array().items(checkoutItem).min(1).max(50).required(),
    recipientName: Joi.string().trim().min(2).max(120).required(),
    recipientPhone: Joi.string().trim().pattern(/^[0-9+\s().-]{8,20}$/).required()
        .messages({ 'string.pattern.base': 'Số điện thoại không hợp lệ' }),
    shippingAddress: Joi.string().trim().min(10).max(500).required(),
    promoCode: Joi.string().trim().uppercase().min(2).max(32).allow('', null),
    note: Joi.string().trim().max(255).allow('', null),
});

const myOrdersQuery = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    status: Joi.string().valid(...ORDER_STATUSES),
});

const adminOrdersQuery = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    status: Joi.string().valid(...ORDER_STATUSES),
    userId: Joi.number().integer().positive(),
});

const updateStatusBody = Joi.object({
    status: Joi.string().valid(...ORDER_STATUSES).required(),
});

module.exports = { ORDER_STATUSES, idParam, checkoutBody, myOrdersQuery, adminOrdersQuery, updateStatusBody };
