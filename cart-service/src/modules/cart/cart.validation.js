const Joi = require('joi');

const skuIdParam = Joi.object({
    skuId: Joi.number().integer().positive().required(),
});

const addItemBody = Joi.object({
    skuId: Joi.number().integer().positive().required(),
    quantity: Joi.number().integer().positive().default(1),
});

const updateItemBody = Joi.object({
    quantity: Joi.number().integer().positive().required(),
});

module.exports = { skuIdParam, addItemBody, updateItemBody };
