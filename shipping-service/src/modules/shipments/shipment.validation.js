const Joi = require('joi');

const SHIPMENT_STATUSES = ['pending', 'picked_up', 'in_transit', 'delivered', 'failed', 'returned'];

const idParam = Joi.object({
    id: Joi.number().integer().positive().required(),
});

const orderCodeParam = Joi.object({
    orderCode: Joi.string().trim().uppercase().min(4).max(32).required(),
});

// Công cụ xem trước phí vận chuyển — khách nhập địa chỉ + cân nặng ước tính, BE trả về phí
// theo ĐÚNG công thức mà Shipping Service dùng khi tự tạo vận đơn (xem utils/shippingFee.js),
// để con số khách thấy trước khi đặt hàng khớp với con số thực tế phát sinh sau này.
const calculateFeeBody = Joi.object({
    address: Joi.string().trim().min(5).max(255).required(),
    weightKg: Joi.number().positive().max(1000).default(1),
});

const myShipmentsQuery = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    status: Joi.string().valid(...SHIPMENT_STATUSES),
});

const adminShipmentsQuery = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    status: Joi.string().valid(...SHIPMENT_STATUSES),
    orderCode: Joi.string().trim().uppercase().max(32),
    carrier: Joi.string().trim().uppercase().max(20),
    userId: Joi.number().integer().positive(),
});

// Admin đẩy vận đơn đi tiếp theo máy trạng thái (mô phỏng webhook cập nhật trạng thái mà
// đơn vị vận chuyển thật — GHTK/GHN — sẽ tự động gọi về hệ thống). note để ghi lại lý do
// (vd: "Khách không nghe máy", "Sai địa chỉ — chuyển hoàn") khi chuyển sang 'failed'/'returned'.
const updateStatusBody = Joi.object({
    status: Joi.string().valid(...SHIPMENT_STATUSES).required(),
    note: Joi.string().trim().max(255).allow('', null),
});

module.exports = {
    SHIPMENT_STATUSES,
    idParam,
    orderCodeParam,
    calculateFeeBody,
    myShipmentsQuery,
    adminShipmentsQuery,
    updateStatusBody,
};
