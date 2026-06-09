const { publishEvent } = require('../config/kafka');
const { PRODUCT_EVENTS } = require('./topics');

// Mọi thay đổi dữ liệu sản phẩm ở tầng Admin đều bắn event lên Kafka — các service khác
// (Warehouse, Cart, Order...) tự lắng nghe và đồng bộ dữ liệu cục bộ, không cần Product Service
// phải biết hay gọi trực tiếp tới từng service đó (giảm coupling, giảm tải đọc).

function toEventVariant(variant) {
    return {
        skuId: variant.id,
        skuCode: variant.sku_code,
        price: Number(variant.price),
        compareAtPrice: variant.compare_at_price !== null ? Number(variant.compare_at_price) : null,
    };
}

async function publishProductCreated(product, variants) {
    await publishEvent(PRODUCT_EVENTS, 'product.created', {
        productId: product.id,
        name: product.name,
        slug: product.slug,
        status: product.status,
        categoryId: product.category_id,
        variants: variants.map(toEventVariant),
    }, product.id);
}

async function publishProductUpdated(product, variants) {
    await publishEvent(PRODUCT_EVENTS, 'product.updated', {
        productId: product.id,
        name: product.name,
        slug: product.slug,
        status: product.status,
        categoryId: product.category_id,
        variants: variants.map(toEventVariant),
    }, product.id);
}

async function publishProductDeleted(productId, skuIds) {
    await publishEvent(PRODUCT_EVENTS, 'product.deleted', { productId, skuIds }, productId);
}

module.exports = { publishProductCreated, publishProductUpdated, publishProductDeleted };
