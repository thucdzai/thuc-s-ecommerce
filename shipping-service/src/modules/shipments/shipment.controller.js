const asyncHandler = require('../../utils/asyncHandler');
const { ok, paginated } = require('../../utils/apiResponse');
const { parsePagination } = require('../../utils/pagination');
const shipmentService = require('./shipment.service');

// POST /api/shipping/calculate-fee — xem trước phí vận chuyển theo địa chỉ + cân nặng ước tính.
const calculateFee = asyncHandler(async (req, res) => {
    const result = await shipmentService.previewFee(req.body);
    return ok(res, result, 'Tính phí vận chuyển thành công');
});

const listMyShipments = asyncHandler(async (req, res) => {
    const pagination = parsePagination(req.query);
    const { items, meta } = await shipmentService.listMyShipments(req.user.id, req.query, pagination);
    return paginated(res, items, meta, 'Lấy danh sách vận đơn thành công');
});

const getMyShipmentDetail = asyncHandler(async (req, res) => {
    const shipment = await shipmentService.getMyShipmentDetail(req.user.id, req.params.orderCode);
    return ok(res, shipment, 'Lấy thông tin vận đơn thành công');
});

module.exports = { calculateFee, listMyShipments, getMyShipmentDetail };
