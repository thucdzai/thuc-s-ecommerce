const asyncHandler = require('../../utils/asyncHandler');
const { ok, paginated } = require('../../utils/apiResponse');
const { parsePagination } = require('../../utils/pagination');
const productService = require('./product.service');

// GET /api/products?page=1&limit=20&sort=price_desc&categoryId=3&q=ao&minPrice=100000&maxPrice=300000
// BE tự tính LIMIT/OFFSET, lọc và sắp xếp — FE chỉ truyền tham số và vẽ lại đúng những gì nhận được.
const list = asyncHandler(async (req, res) => {
    const pagination = parsePagination(req.query);
    const { items, meta } = await productService.listProducts(req.query, pagination);
    return paginated(res, items, meta, 'Lấy danh sách sản phẩm thành công');
});

const getDetail = asyncHandler(async (req, res) => {
    const detail = await productService.getProductDetail(Number(req.params.id));
    return ok(res, detail, 'Lấy chi tiết sản phẩm thành công');
});

module.exports = { list, getDetail };
