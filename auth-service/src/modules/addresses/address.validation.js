const Joi = require('joi');

const userIdParam = Joi.object({
    userId: Joi.number().integer().positive().required(),
});

const addressIdParams = Joi.object({
    userId: Joi.number().integer().positive().required(),
    addressId: Joi.number().integer().positive().required(),
});

const upsertAddress = Joi.object({
    recipientName: Joi.string().trim().min(2).max(100).required(),
    phone: Joi.string().trim().min(8).max(20).required(),
    province: Joi.string().trim().min(2).max(100).required(),
    district: Joi.string().trim().min(2).max(100).required(),
    ward: Joi.string().trim().min(2).max(100).required(),
    streetDetail: Joi.string().trim().min(2).max(255).required(),
    isDefault: Joi.boolean().default(false),
});

module.exports = { userIdParam, addressIdParams, upsertAddress };
