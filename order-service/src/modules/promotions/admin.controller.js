const asyncHandler = require('../../utils/asyncHandler');
const { ok, created, paginated } = require('../../utils/apiResponse');
const { parsePagination } = require('../../utils/pagination');
const promotionService = require('./promotion.service');

// GET /api/admin/promotions — BE tự lọc theo trạng thái/mã + phân trang.
const list = asyncHandler(async (req, res) => {
    const pagination = parsePagination(req.query);
    const { items, meta } = await promotionService.listPromotions(req.query, pagination);
    return paginated(res, items, meta, 'Lấy danh sách khuyến mãi thành công');
});

const getOne = asyncHandler(async (req, res) => {
    const promotion = await promotionService.getPromotionById(Number(req.params.id));
    return ok(res, promotion, 'Lấy chi tiết khuyến mãi thành công');
});

const create = asyncHandler(async (req, res) => {
    const promotion = await promotionService.createPromotion(req.body);
    return created(res, promotion, 'Tạo mã khuyến mãi thành công');
});

const update = asyncHandler(async (req, res) => {
    const promotion = await promotionService.updatePromotion(Number(req.params.id), req.body);
    return ok(res, promotion, 'Cập nhật mã khuyến mãi thành công');
});

module.exports = { list, getOne, create, update };
