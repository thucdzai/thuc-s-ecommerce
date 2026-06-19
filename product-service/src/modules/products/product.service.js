const AppError = require('../../utils/AppError');
const { buildMeta } = require('../../utils/pagination');
const slugify = require('../../utils/slugify');
const productRepository = require('./product.repository');
const productEvents = require('../../events/productEvents.publisher');
const redis = require('../../config/redis');

// ---------------------------------------------------------------------------
// Cache truy vấn đọc bằng Redis — trang danh mục/chi tiết sản phẩm bị khách lướt qua lại,
// đổi bộ lọc, bấm tới bấm lui rất nhiều trong khi dữ liệu sản phẩm lại ít khi đổi. Mỗi lần
// tính lại đều phải JOIN variants + GROUP BY + MIN/MAX giá (listForCatalog) hoặc 4 query nối
// tiếp (findDetailById) — cache giúp những lượt bấm lặp lại không phải chạm tới MySQL.
//
// Danh sách: dùng "cache version" — một số đếm dùng chung cho mọi tổ hợp filter/trang. Khi có
// sản phẩm được tạo/sửa/xoá, chỉ cần INCR version là toàn bộ key danh sách cũ (mang version cũ)
// lập tức "vô hình" với code (key mới sẽ không khớp) và tự bị Redis dọn khi hết TTL — khỏi phải
// dò/xoá từng key theo từng tổ hợp filter.
// Chi tiết: cache theo từng productId, xoá đúng key đó khi sản phẩm bị sửa/xoá (invalidate chính xác).
// ---------------------------------------------------------------------------
const LIST_CACHE_VERSION_KEY = 'product:list_cache_version';
const LIST_CACHE_TTL_SECONDS = 5 * 60;
const DETAIL_CACHE_TTL_SECONDS = 10 * 60;

async function getListCacheVersion() {
    const version = await redis.client.get(LIST_CACHE_VERSION_KEY);
    return version || '1';
}

async function bumpListCacheVersion() {
    await redis.client.incr(LIST_CACHE_VERSION_KEY);
    console.log('[Cache][Redis] Dữ liệu sản phẩm vừa thay đổi — tăng phiên bản cache danh sách (mọi cache danh sách cũ tự vô hiệu)');
}

function buildListCacheKey(version, filters, pagination) {
    const parts = [
        filters.categoryId ?? '_',
        filters.q ?? '_',
        filters.minPrice ?? '_',
        filters.maxPrice ?? '_',
        filters.sort ?? '_',
        pagination.page,
        pagination.limit,
    ];
    return `product:list:v${version}:${parts.join(':')}`;
}

function detailCacheKey(id) {
    return `product:detail:${id}`;
}

async function invalidateDetailCache(id) {
    const key = detailCacheKey(id);
    await redis.client.del(key);
    console.log(`[Cache][Redis] Đã xoá cache chi tiết sản phẩm #${id} do dữ liệu vừa thay đổi (key=${key})`);
}

// ---------------------------------------------------------------------------
// Đọc dữ liệu (public) — toàn bộ logic phân trang/lọc/sắp xếp xử lý ở đây,
// FE chỉ truyền tham số và nhận về danh sách + pagination để vẽ giao diện.
// ---------------------------------------------------------------------------
async function listProducts(query, pagination) {
    const filters = {
        categoryId: query.categoryId,
        q: query.q,
        minPrice: query.minPrice,
        maxPrice: query.maxPrice,
        sort: query.sort,
    };

    const version = await getListCacheVersion();
    const cacheKey = buildListCacheKey(version, filters, pagination);

    const cached = await redis.client.get(cacheKey);
    if (cached) {
        console.log(`[Cache][Redis] Lấy danh sách sản phẩm TỪ REDIS — không chạm MySQL (key=${cacheKey})`);
        return JSON.parse(cached);
    }

    const [items, totalItems] = await Promise.all([
        productRepository.listForCatalog(filters, pagination),
        productRepository.countListed(filters),
    ]);
    const result = { items, meta: buildMeta(pagination.page, pagination.limit, totalItems) };

    console.log(`[Cache][DB] Cache chưa có/đã hết hạn — lấy danh sách sản phẩm TỪ MySQL rồi lưu vào Redis (key=${cacheKey}, TTL=${LIST_CACHE_TTL_SECONDS}s)`);
    await redis.client.set(cacheKey, JSON.stringify(result), 'EX', LIST_CACHE_TTL_SECONDS);

    return result;
}

// Danh sách cho trang quản trị — không qua Redis cache (admin cần thấy ngay sản phẩm vừa
// tạo/sửa, và lượt truy cập ít hơn nhiều so với catalog công khai nên không cần tối ưu).
// Khác listProducts: KHÔNG khoá status='active', cho phép lọc theo status tùy chọn để admin
// vẫn thấy/quản lý được sản phẩm "Bản nháp"/"Ngừng bán".
async function listProductsForAdmin(query, pagination) {
    const filters = {
        status: query.status,
        categoryId: query.categoryId,
        q: query.q,
    };

    const [items, totalItems] = await Promise.all([
        productRepository.listForAdmin(filters, pagination),
        productRepository.countListedForAdmin(filters),
    ]);

    return { items, meta: buildMeta(pagination.page, pagination.limit, totalItems) };
}

function toPublicDetail({ product, images, variants }) {
    return {
        id: product.id,
        categoryId: product.category_id,
        name: product.name,
        slug: product.slug,
        description: product.description,
        thumbnailUrl: product.thumbnail_url,
        status: product.status,
        images: images.map((img) => img.image_url),
        variants: variants.map((v) => ({
            id: v.id,
            skuCode: v.sku_code,
            name: v.name,
            price: Number(v.price),
            compareAtPrice: v.compare_at_price !== null ? Number(v.compare_at_price) : null,
            imageUrl: v.image_url,
            attributes: v.attributes,
        })),
    };
}

async function getProductDetail(id) {
    const cacheKey = detailCacheKey(id);

    const cached = await redis.client.get(cacheKey);
    if (cached) {
        console.log(`[Cache][Redis] Lấy chi tiết sản phẩm #${id} TỪ REDIS — không chạm MySQL (key=${cacheKey})`);
        return JSON.parse(cached);
    }

    const detail = await productRepository.findDetailById(id);
    if (!detail) {
        throw new AppError(404, 'Không tìm thấy sản phẩm');
    }
    const result = toPublicDetail(detail);

    console.log(`[Cache][DB] Cache chưa có/đã hết hạn — lấy chi tiết sản phẩm #${id} TỪ MySQL rồi lưu vào Redis (key=${cacheKey}, TTL=${DETAIL_CACHE_TTL_SECONDS}s)`);
    await redis.client.set(cacheKey, JSON.stringify(result), 'EX', DETAIL_CACHE_TTL_SECONDS);

    return result;
}

// ---------------------------------------------------------------------------
// Ghi dữ liệu (admin) — sau khi commit DB thành công mới publish event lên Kafka,
// đảm bảo consumer không nhận được sự kiện về dữ liệu "chưa thực sự tồn tại".
// ---------------------------------------------------------------------------
async function createProduct(payload) {
    const slug = payload.slug || slugify(payload.name);

    const productId = await productRepository.create({ ...payload, slug });

    const product = await productRepository.findById(productId);
    const variants = await productRepository.findVariantsByProductId(productId);

    await productEvents.publishProductCreated(product, variants);
    // Sản phẩm mới sẽ xuất hiện trong các trang danh mục — mọi cache danh sách cũ phải vô hiệu.
    await bumpListCacheVersion();

    return toPublicDetail({ product, images: payload.images.map((url) => ({ image_url: url })), variants: variants.map((v) => ({ ...v, attributes: {} })) });
}

async function updateProduct(id, payload) {
    const existing = await productRepository.findById(id);
    if (!existing) {
        throw new AppError(404, 'Không tìm thấy sản phẩm');
    }

    const slug = payload.slug || slugify(payload.name);
    await productRepository.update(id, { ...payload, slug });

    const product = await productRepository.findById(id);
    const variants = await productRepository.findVariantsByProductId(id);

    await productEvents.publishProductUpdated(product, variants);
    // Dữ liệu sản phẩm này (giá, tên, ảnh...) đã đổi — xoá đúng cache chi tiết của nó, đồng thời
    // mọi cache danh sách cũ (có thể đang hiển thị giá/tên cũ) cũng phải vô hiệu.
    await Promise.all([invalidateDetailCache(id), bumpListCacheVersion()]);

    return getProductDetail(id);
}

async function deleteProduct(id) {
    const existing = await productRepository.findById(id);
    if (!existing) {
        throw new AppError(404, 'Không tìm thấy sản phẩm');
    }

    const skuIds = await productRepository.remove(id);
    await productEvents.publishProductDeleted(id, skuIds);
    // Sản phẩm không còn tồn tại — xoá cache chi tiết của nó và vô hiệu mọi cache danh sách cũ
    // (nếu không, khách vẫn thấy nó trong danh mục cho tới khi cache hết hạn).
    await Promise.all([invalidateDetailCache(id), bumpListCacheVersion()]);
}

module.exports = { listProducts, listProductsForAdmin, getProductDetail, createProduct, updateProduct, deleteProduct };
