const asyncHandler = require('../../utils/asyncHandler');
const { ok, created, paginated } = require('../../utils/apiResponse');
const { parsePagination } = require('../../utils/pagination');
const productService = require('./product.service');

// GET /api/admin/products?status=discontinued — KHÔNG ép buộc status='active' như catalog công
// khai, để admin vẫn thấy/quản lý được sản phẩm "Bản nháp"/"Ngừng bán" (vd để mở bán lại).
const list = asyncHandler(async (req, res) => {
    const pagination = parsePagination(req.query);
    const { items, meta } = await productService.listProductsForAdmin(req.query, pagination);
    return paginated(res, items, meta, 'Lấy danh sách sản phẩm thành công');
});

const create = asyncHandler(async (req, res) => {
    const product = await productService.createProduct(req.body);
    return created(res, product, 'Tạo sản phẩm thành công');
});

const update = asyncHandler(async (req, res) => {
    const product = await productService.updateProduct(Number(req.params.id), req.body);
    return ok(res, product, 'Cập nhật sản phẩm thành công');
});

const remove = asyncHandler(async (req, res) => {
    await productService.deleteProduct(Number(req.params.id));
    return ok(res, null, 'Xóa sản phẩm thành công');
});

module.exports = { list, create, update, remove };
