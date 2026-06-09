const Joi = require('joi');

const updateProfile = Joi.object({
    fullName: Joi.string().min(2).max(100).trim(),
    phone: Joi.string().max(20).allow('', null),
    email: Joi.string().email().max(150).lowercase().trim(),
}).min(1);

const adminListQuery = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    q: Joi.string().max(100).allow('').optional(),
});

module.exports = { updateProfile, adminListQuery };
