const asyncHandler = require('../../utils/asyncHandler');
const { ok } = require('../../utils/apiResponse');
const inventoryService = require('./inventory.service');

// PUT /api/admin/inventory/:skuId/adjust — Admin nhập thêm hàng (số dương) hoặc điều chỉnh giảm sau kiểm kê (số âm).
const adjust = asyncHandler(async (req, res) => {
    const { quantityChange, note } = req.body;
    const result = await inventoryService.adjustStock({ skuId: Number(req.params.skuId), quantityChange, note });
    return ok(res, result, 'Điều chỉnh tồn kho thành công');
});

module.exports = { adjust };
