const Joi = require('joi');

const DISCOUNT_TYPES = ['percentage', 'fixed'];
const STATUSES = ['active', 'inactive'];

const idParam = Joi.object({
    id: Joi.number().integer().positive().required(),
});

const codeParam = Joi.object({
    code: Joi.string().trim().uppercase().min(2).max(32).required(),
});

const listQuery = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    status: Joi.string().valid(...STATUSES),
    code: Joi.string().trim().max(32),
});

// Ràng buộc chung cho create/update — discount percentage không được vượt 100,
// max_discount_amount chỉ có ý nghĩa với loại 'percentage' (giảm 'fixed' đã là số tiền cố định).
const baseFields = {
    description: Joi.string().trim().max(255).allow('', null),
    discountType: Joi.string().valid(...DISCOUNT_TYPES).required(),
    discountValue: Joi.number().positive().required(),
    maxDiscountAmount: Joi.number().positive().allow(null),
    minOrderAmount: Joi.number().min(0).default(0),
    usageLimit: Joi.number().integer().positive().allow(null),
    startsAt: Joi.date().iso().required(),
    endsAt: Joi.date().iso().min(Joi.ref('startsAt')).required(),
    status: Joi.string().valid(...STATUSES).default('active'),
};

const createBody = Joi.object({
    code: Joi.string().trim().uppercase().min(2).max(32).required(),
    ...baseFields,
}).custom((value, helpers) => {
    if (value.discountType === 'percentage' && value.discountValue > 100) {
        return helpers.message('Phần trăm giảm giá không thể vượt quá 100');
    }
    return value;
});

const updateBody = Joi.object({ ...baseFields }).custom((value, helpers) => {
    if (value.discountType === 'percentage' && value.discountValue > 100) {
        return helpers.message('Phần trăm giảm giá không thể vượt quá 100');
    }
    return value;
});

const previewBody = Joi.object({
    code: Joi.string().trim().uppercase().min(2).max(32).required(),
    // subtotalAmount do FE forward LẠI giá trị `subtotal` mà chính Cart Service đã tính sẵn —
    // không phải FE tự tính, nên không vi phạm nguyên tắc "mọi phép tính nằm ở BE".
    // Order Service vẫn tự tính lại con số chính thức một lần nữa khi checkout thật sự.
    subtotalAmount: Joi.number().min(0).required(),
});

module.exports = { idParam, codeParam, listQuery, createBody, updateBody, previewBody };
