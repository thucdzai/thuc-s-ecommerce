const asyncHandler = require('../../utils/asyncHandler');
const { ok, paginated } = require('../../utils/apiResponse');
const { parsePagination } = require('../../utils/pagination');
const orderService = require('./order.service');

// GET /api/admin/orders — toàn bộ đơn hàng hệ thống, BE tự lọc theo user/trạng thái + phân trang.
const list = asyncHandler(async (req, res) => {
    const pagination = parsePagination(req.query);
    const { items, meta } = await orderService.listOrdersAdmin(req.query, pagination);
    return paginated(res, items, meta, 'Lấy danh sách đơn hàng thành công');
});

const getOne = asyncHandler(async (req, res) => {
    const order = await orderService.getOrderDetailAdmin(Number(req.params.id));
    return ok(res, order, 'Lấy chi tiết đơn hàng thành công');
});

// PUT /api/admin/orders/:id/status — chuyển trạng thái đơn theo đúng máy trạng thái đã định nghĩa,
// kèm các hiệu ứng phụ trên Warehouse Service (nhả/trừ kho) khi cần — xem order.service.js.
const updateStatus = asyncHandler(async (req, res) => {
    const order = await orderService.updateOrderStatusByAdmin(Number(req.params.id), req.body.status, req.accessToken);
    return ok(res, order, 'Cập nhật trạng thái đơn hàng thành công');
});

module.exports = { list, getOne, updateStatus };
