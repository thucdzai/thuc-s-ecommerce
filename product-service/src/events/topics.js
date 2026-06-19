// Tên topic Kafka — đặt tập trung tại đây để mọi service tham chiếu cùng một hằng số,
// tránh lệch tên topic giữa producer (Product) và consumer (Warehouse, Cart, Order...).
module.exports = {
    PRODUCT_EVENTS: 'product-events',
};

/**
 * Hợp đồng sự kiện (event contract) trên topic PRODUCT_EVENTS — các service khác cứ theo đây mà consume:
 *
 * Envelope chung:
 * {
 *   eventType: 'product.created' | 'product.updated' | 'product.deleted',
 *   occurredAt: ISO-8601 string,
 *   source: 'product-service',
 *   data: { ... tùy eventType, xem bên dưới }
 * }
 *
 * - product.created / product.updated:
 *   data: {
 *     productId, name, slug, status, categoryId,
 *     variants: [{ skuId, skuCode, price, compareAtPrice }]
 *   }
 *   → Warehouse Service dùng để biết SKU mới cần khởi tạo dòng inventory.
 *   → Cart/Order Service dùng để cập nhật cache tên/giá hiển thị mà không cần gọi đồng bộ liên tục.
 *
 * - product.deleted:
 *   data: { productId, skuIds: [skuId, ...] }
 *   → Các service liên quan tự đánh dấu sản phẩm/SKU này là ngừng kinh doanh trong dữ liệu cục bộ của họ.
 *
 * Message key = productId (dạng string) → đảm bảo các sự kiện của cùng 1 sản phẩm luôn vào cùng 1
 * partition và được xử lý đúng thứ tự (created → updated → deleted).
 */
