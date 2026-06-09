const Joi = require('joi');

const CHANGE_TYPES = ['lock', 'release', 'deduct', 'import', 'adjustment'];

const skuIdParam = Joi.object({
    skuId: Joi.number().integer().positive().required(),
});

const lockBody = Joi.object({
    skuId: Joi.number().integer().positive().required(),
    orderId: Joi.string().trim().min(1).max(64).required(),
    quantity: Joi.number().integer().positive().required(),
});

const releaseBody = Joi.object({
    skuId: Joi.number().integer().positive().required(),
    orderId: Joi.string().trim().min(1).max(64).required(),
});

const deductBody = Joi.object({
    skuId: Joi.number().integer().positive().required(),
    orderId: Joi.string().trim().min(1).max(64).required(),
    quantity: Joi.number().integer().positive().required(),
});

// skuId của API điều chỉnh nằm trên URL (PUT /admin/inventory/:skuId/adjust), không lặp lại trong body.
const adjustBody = Joi.object({
    quantityChange: Joi.number().integer().invalid(0).required(),
    note: Joi.string().trim().max(255).allow('', null),
});

// Query của GET /api/inventory/logs — BE nhận đủ tham số lọc/phân trang, FE chỉ truyền và vẽ lại.
const logsQuery = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    skuId: Joi.number().integer().positive(),
    changeType: Joi.string().valid(...CHANGE_TYPES),
    fromDate: Joi.date().iso(),
    toDate: Joi.date().iso(),
});

module.exports = { skuIdParam, lockBody, releaseBody, deductBody, adjustBody, logsQuery };
