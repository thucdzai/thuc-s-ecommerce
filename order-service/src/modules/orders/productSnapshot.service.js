const productSnapshotRepository = require('./productSnapshot.repository');

// ---------------------------------------------------------------------------
// Đồng bộ "bản sao đọc" tên/giá sản phẩm từ sự kiện Kafka 'product-events' do Product Service
// phát ra — CÙNG THIẾT KẾ với Cart Service (xem cart.service.js#syncFromProductEvent), tách
// thành module riêng ở đây vì Order Service còn nhiều logic nghiệp vụ khác (checkout, khuyến mãi,
// trạng thái đơn) nên gom việc đồng bộ snapshot vào 1 chỗ cho rõ ràng, dễ bảo trì.
// ---------------------------------------------------------------------------
async function syncFromProductEvent(envelope) {
    const { eventType, data } = envelope;

    switch (eventType) {
        case 'product.created':
        case 'product.updated':
            for (const variant of data.variants) {
                await productSnapshotRepository.upsertSnapshot({
                    skuId: variant.skuId,
                    skuCode: variant.skuCode,
                    productId: data.productId,
                    productName: data.name,
                    price: variant.price,
                    compareAtPrice: variant.compareAtPrice,
                    status: data.status,
                });
            }
            console.log(`[Sync] Đã đồng bộ ${data.variants.length} SKU từ sự kiện ${eventType} (productId=${data.productId})`);
            break;

        case 'product.deleted':
            await productSnapshotRepository.markDiscontinued(data.skuIds);
            console.log(`[Sync] Đã đánh dấu ngừng kinh doanh ${data.skuIds.length} SKU từ sự kiện ${eventType} (productId=${data.productId})`);
            break;

        default:
            console.warn(`[Sync] Bỏ qua eventType không xác định: ${eventType}`);
    }
}

module.exports = { syncFromProductEvent };
