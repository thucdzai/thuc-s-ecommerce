const asyncHandler = require('../../utils/asyncHandler');
const { ok, created, paginated } = require('../../utils/apiResponse');
const { parsePagination } = require('../../utils/pagination');
const orderService = require('./order.service');

// POST /api/orders/checkout — chốt đơn từ danh sách skuId+quantity, BE tự tra giá, áp khuyến mãi,
// giữ chỗ tồn kho và tính tổng tiền cuối cùng. Forward access token gốc sang Warehouse Service.
const checkout = asyncHandler(async (req, res) => {
    const order = await orderService.checkout(req.user, req.body, req.accessToken);
    return created(res, order, 'Đặt hàng thành công, đơn của bạn đang chờ thanh toán');
});

// GET /api/orders/me — lịch sử đơn hàng của chính khách, BE tự lọc theo trạng thái + phân trang.
const listMine = asyncHandler(async (req, res) => {
    const pagination = parsePagination(req.query);
    const { items, meta } = await orderService.listMyOrders(req.user.id, req.query, pagination);
    return paginated(res, items, meta, 'Lấy danh sách đơn hàng thành công');
});

// GET /api/orders/me/:id — chi tiết 1 đơn của chính khách.
const getMine = asyncHandler(async (req, res) => {
    const order = await orderService.getMyOrderDetail(req.user.id, Number(req.params.id));
    return ok(res, order, 'Lấy chi tiết đơn hàng thành công');
});

module.exports = { checkout, listMine, getMine };
