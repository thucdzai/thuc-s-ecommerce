const Joi = require('joi');

const register = Joi.object({
    email: Joi.string().trim().lowercase().email().max(150).required(),
    password: Joi.string().min(6).max(100).required(),
    fullName: Joi.string().trim().min(2).max(100).required(),
});

const login = Joi.object({
    email: Joi.string().trim().lowercase().email().required(),
    password: Joi.string().required(),
});

const refreshToken = Joi.object({
    refreshToken: Joi.string().required(),
});

const forgotPassword = Joi.object({
    email: Joi.string().trim().lowercase().email().required(),
});

const resetPassword = Joi.object({
    token: Joi.string().required(),
    newPassword: Joi.string().min(6).max(100).required(),
});

module.exports = { register, login, refreshToken, forgotPassword, resetPassword };
