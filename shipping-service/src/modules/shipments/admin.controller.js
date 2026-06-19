const asyncHandler = require('../../utils/asyncHandler');
const { ok, paginated } = require('../../utils/apiResponse');
const { parsePagination } = require('../../utils/pagination');
const shipmentService = require('./shipment.service');

// GET /api/admin/shipments — toàn bộ vận đơn hệ thống, phục vụ theo dõi/đối soát vận chuyển.
const list = asyncHandler(async (req, res) => {
    const pagination = parsePagination(req.query);
    const { items, meta } = await shipmentService.listShipmentsAdmin(req.query, pagination);
    return paginated(res, items, meta, 'Lấy danh sách vận đơn thành công');
});

const getOne = asyncHandler(async (req, res) => {
    const shipment = await shipmentService.getShipmentDetailAdmin(Number(req.params.id));
    return ok(res, shipment, 'Lấy chi tiết vận đơn thành công');
});

// PUT /api/admin/shipments/:id/status — mô phỏng webhook cập nhật trạng thái từ đơn vị vận chuyển
// (xem ghi chú trong shipment.service.js#updateShipmentStatusAdmin).
const updateStatus = asyncHandler(async (req, res) => {
    const shipment = await shipmentService.updateShipmentStatusAdmin(Number(req.params.id), req.body.status, req.body.note);
    return ok(res, shipment, 'Cập nhật trạng thái vận đơn thành công');
});

module.exports = { list, getOne, updateStatus };
