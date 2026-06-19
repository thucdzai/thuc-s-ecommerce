const asyncHandler = require('../../utils/asyncHandler');
const { ok } = require('../../utils/apiResponse');
const promotionService = require('./promotion.service');

// POST /api/promotions/preview — xem trước mức giảm giá của 1 mã trước khi đặt hàng.
const preview = asyncHandler(async (req, res) => {
    const { code, subtotalAmount } = req.body;
    const result = await promotionService.preview(code, subtotalAmount);
    return ok(res, result, 'Mã khuyến mãi hợp lệ');
});

module.exports = { preview };
