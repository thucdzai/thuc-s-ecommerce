const asyncHandler = require('../../utils/asyncHandler');
const { ok, created, paginated } = require('../../utils/apiResponse');
const { parsePagination } = require('../../utils/pagination');
const inventoryService = require('./inventory.service');

// GET /api/inventory/:skuId — kiểm tra nhanh số lượng tồn thực tế / khả dụng của 1 SKU.
const getBySkuId = asyncHandler(async (req, res) => {
    const inventory = await inventoryService.getInventoryBySkuId(Number(req.params.skuId));
    return ok(res, inventory, 'Lấy thông tin tồn kho thành công');
});

// POST /api/inventory/lock — Order Service gọi ngay khi khách bấm đặt hàng để giữ chỗ 15 phút.
const lock = asyncHandler(async (req, res) => {
    const result = await inventoryService.lockStock(req.body);
    return created(res, result, 'Giữ chỗ tồn kho thành công');
});

// POST /api/inventory/release — nhả lại số lượng đã giữ khi đơn bị hủy / hết hạn thanh toán.
const release = asyncHandler(async (req, res) => {
    const result = await inventoryService.releaseStock(req.body);
    return ok(res, result, 'Nhả chỗ tồn kho thành công');
});

// POST /api/inventory/deduct — trừ thẳng vào tồn thực tế khi Payment Service xác nhận đã nhận tiền.
const deduct = asyncHandler(async (req, res) => {
    const result = await inventoryService.deductStock(req.body);
    return ok(res, result, 'Trừ kho thành công');
});

// GET /api/inventory/logs — BE tự lọc/gom nhóm/phân trang lịch sử biến động kho.
const listLogs = asyncHandler(async (req, res) => {
    const pagination = parsePagination(req.query);
    const { items, meta } = await inventoryService.listStockLogs(req.query, pagination);
    return paginated(res, items, meta, 'Lấy lịch sử kho thành công');
});

module.exports = { getBySkuId, lock, release, deduct, listLogs };
