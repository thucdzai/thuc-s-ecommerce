const asyncHandler = require('../../utils/asyncHandler');
const { ok, paginated } = require('../../utils/apiResponse');
const { parsePagination } = require('../../utils/pagination');
const paymentService = require('./payment.service');

// GET /api/admin/payments — toàn bộ giao dịch thanh toán hệ thống, phục vụ đối soát doanh thu.
const list = asyncHandler(async (req, res) => {
    const pagination = parsePagination(req.query);
    const { items, meta } = await paymentService.listPaymentsAdmin(req.query, pagination);
    return paginated(res, items, meta, 'Lấy danh sách giao dịch thành công');
});

const getOne = asyncHandler(async (req, res) => {
    const transaction = await paymentService.getPaymentDetailAdmin(Number(req.params.id));
    return ok(res, transaction, 'Lấy chi tiết giao dịch thành công');
});

module.exports = { list, getOne };
