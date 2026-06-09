const Joi = require('joi');

const SORT_OPTIONS = ['newest', 'price_asc', 'price_desc', 'name_asc'];

// Query của GET /api/products — đúng tinh thần đề bài: BE nhận page/limit/sort và mọi tham số lọc.
const listQuery = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sort: Joi.string().valid(...SORT_OPTIONS).default('newest'),
    categoryId: Joi.number().integer().positive(),
    q: Joi.string().trim().max(200),
    minPrice: Joi.number().min(0),
    maxPrice: Joi.number().min(0),
});

const idParam = Joi.object({
    id: Joi.number().integer().positive().required(),
});

// Query của GET /api/admin/products — khác listQuery ở chỗ KHÔNG ép buộc status = 'active':
// admin cần thấy cả sản phẩm "Bản nháp"/"Ngừng bán" để còn quản lý/mở bán lại, nên `status`
// ở đây là bộ lọc tùy chọn (để trống = xem tất cả) thay vì giá trị mặc định khoá cứng.
const adminListQuery = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    status: Joi.string().valid('draft', 'active', 'discontinued'),
    categoryId: Joi.number().integer().positive(),
    q: Joi.string().trim().max(200),
});

// allowRelative: true — admin có thể dán URL ảnh ngoài (http://...) HOẶC tải ảnh lên trực
// tiếp, lúc đó BE trả về đường dẫn tương đối dạng '/uploads/<file>' (xem modules/uploads),
// được trình duyệt tự phân giải theo origin hiện tại (qua Nginx reverse-proxy /uploads).
const variantInput = Joi.object({
    // id — gửi kèm khi sửa biến thể đã tồn tại để BE nhận diện đúng hàng cần cập nhật
    // (xem product.repository.js update(): khớp theo id thay vì sku_code, để đổi mã SKU
    // không làm mất sku_id đang được warehouse-service dùng làm khóa tồn kho).
    id: Joi.number().integer().positive(),
    skuCode: Joi.string().trim().min(3).max(64).required(),
    // Tên hiển thị cho khách (vd "Áo thun đen size M") — tách biệt với mã SKU nội bộ do người
    // bán tự đặt để quản lý kho; nếu để trống thì FE sẽ hiển thị thuộc tính/mã SKU thay thế.
    name: Joi.string().trim().max(150).allow('', null),
    price: Joi.number().positive().required(),
    compareAtPrice: Joi.number().positive().allow(null),
    imageUrl: Joi.string().uri({ allowRelative: true }).allow(null, ''),
    attributes: Joi.object().pattern(Joi.string().max(50), Joi.string().max(100)).default({}),
});

const createProduct = Joi.object({
    categoryId: Joi.number().integer().positive().required(),
    name: Joi.string().trim().min(2).max(200).required(),
    slug: Joi.string().trim().lowercase().max(220),
    description: Joi.string().allow('', null),
    thumbnailUrl: Joi.string().uri({ allowRelative: true }).allow(null, ''),
    status: Joi.string().valid('draft', 'active', 'discontinued').default('draft'),
    images: Joi.array().items(Joi.string().uri({ allowRelative: true })).default([]),
    variants: Joi.array().items(variantInput).min(1).required(),
});

const updateProduct = Joi.object({
    categoryId: Joi.number().integer().positive().required(),
    name: Joi.string().trim().min(2).max(200).required(),
    slug: Joi.string().trim().lowercase().max(220),
    description: Joi.string().allow('', null),
    thumbnailUrl: Joi.string().uri({ allowRelative: true }).allow(null, ''),
    status: Joi.string().valid('draft', 'active', 'discontinued').required(),
    images: Joi.array().items(Joi.string().uri({ allowRelative: true })).default([]),
    variants: Joi.array().items(variantInput).min(1).required(),
});

module.exports = { listQuery, adminListQuery, idParam, createProduct, updateProduct };
