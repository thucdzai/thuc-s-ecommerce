const env = require('../../config/env');
const AppError = require('../../utils/AppError');
const cartRepository = require('./cart.repository');

// ---------------------------------------------------------------------------
// Helpers — định dạng dữ liệu trả ra ngoài & các phép tính tiền (luôn ở BE, FE chỉ vẽ lại).
// ---------------------------------------------------------------------------

function toMoney(value) {
    // Cộng dồn bằng số nguyên (đơn vị: đồng) để tránh sai số dấu phẩy động khi nhân/cộng nhiều dòng.
    return Math.round(Number(value));
}

// Một item được coi là "có thể mua" khi đã đồng bộ được snapshot và sản phẩm đang active.
// Snapshot rỗng (chưa kịp đồng bộ Kafka) hoặc 'draft'/'discontinued' đều bị coi là không khả dụng,
// để tránh tính tiền theo dữ liệu cũ/sai và cảnh báo khách trước khi qua bước đặt hàng.
function isAvailable(row) {
    return Boolean(row.product_id) && row.product_status === 'active';
}

function toPublicItem(row) {
    const price = row.price !== null ? toMoney(row.price) : null;
    const available = isAvailable(row);
    const lineTotal = available ? toMoney(price * row.quantity) : 0;

    return {
        skuId: row.sku_id,
        skuCode: row.sku_code,
        productId: row.product_id,
        productName: row.product_name,
        productSlug: row.product_slug,
        price,
        compareAtPrice: row.compare_at_price !== null ? toMoney(row.compare_at_price) : null,
        quantity: row.quantity,
        lineTotal,
        available,
        unavailableReason: available
            ? null
            : (row.product_id ? 'Sản phẩm đã ngừng kinh doanh' : 'Sản phẩm chưa được đồng bộ, vui lòng thử lại sau'),
    };
}

function buildCartSummary(items) {
    const availableItems = items.filter((item) => item.available);

    return {
        items,
        itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
        subtotal: toMoney(availableItems.reduce((sum, item) => sum + item.lineTotal, 0)),
        unavailableCount: items.length - availableItems.length,
    };
}

// ---------------------------------------------------------------------------
// Cart — tạo "lười" (lazy creation): chỉ sinh dòng carts khi người dùng thao tác lần đầu.
// ---------------------------------------------------------------------------

async function getOrCreateCart(userId) {
    const existing = await cartRepository.findCartByUserId(userId);
    if (existing) return existing;

    try {
        return await cartRepository.createCart(userId);
    } catch (err) {
        // Race condition: 2 request đầu tiên của cùng 1 user cùng lúc cố tạo giỏ hàng —
        // request thua cuộc sẽ đụng UNIQUE(user_id), chỉ cần đọc lại giỏ vừa được request kia tạo.
        if (err.code === 'ER_DUP_ENTRY') {
            return cartRepository.findCartByUserId(userId);
        }
        throw err;
    }
}

// ---------------------------------------------------------------------------
// GET /api/cart — BE tự JOIN snapshot, tính lineTotal/subtotal/itemCount, FE chỉ render.
// ---------------------------------------------------------------------------
async function getCart(userId) {
    const cart = await getOrCreateCart(userId);
    const rows = await cartRepository.findItemsWithSnapshot(cart.id);
    const items = rows.map(toPublicItem);

    return { cartId: cart.id, ...buildCartSummary(items) };
}

// ---------------------------------------------------------------------------
// POST /api/cart/items — thêm sản phẩm vào giỏ; nếu đã tồn tại thì CỘNG DỒN số lượng,
// có chặn vượt quá MAX_QUANTITY_PER_ITEM để tránh giỏ hàng phình to bất thường.
// ---------------------------------------------------------------------------
async function addItem(userId, { skuId, quantity }) {
    const snapshot = await cartRepository.findSnapshotBySkuId(skuId);
    if (!snapshot) {
        throw new AppError(404, 'Không tìm thấy sản phẩm này');
    }
    if (snapshot.status !== 'active') {
        throw new AppError(409, 'Sản phẩm hiện không thể đặt mua (đã ngừng kinh doanh hoặc chưa mở bán)');
    }

    const cart = await getOrCreateCart(userId);
    const existingItem = await cartRepository.findItem(cart.id, skuId);
    const nextQuantity = (existingItem ? existingItem.quantity : 0) + quantity;

    if (nextQuantity > env.maxQuantityPerItem) {
        throw new AppError(409, `Số lượng tối đa cho phép cho mỗi sản phẩm trong giỏ là ${env.maxQuantityPerItem}`, {
            currentQuantity: existingItem ? existingItem.quantity : 0,
            requested: quantity,
            max: env.maxQuantityPerItem,
        });
    }

    if (existingItem) {
        await cartRepository.updateItemQuantity(cart.id, skuId, nextQuantity);
    } else {
        await cartRepository.insertItem(cart.id, skuId, nextQuantity);
    }

    return getCart(userId);
}

// ---------------------------------------------------------------------------
// PATCH /api/cart/items/:skuId — ĐẶT (không cộng dồn) số lượng về đúng giá trị FE gửi lên,
// dùng khi khách bấm +/- hoặc nhập tay số lượng trên trang giỏ hàng.
// ---------------------------------------------------------------------------
async function updateItemQuantity(userId, skuId, quantity) {
    const cart = await getOrCreateCart(userId);
    const existingItem = await cartRepository.findItem(cart.id, skuId);
    if (!existingItem) {
        throw new AppError(404, 'Sản phẩm này không có trong giỏ hàng');
    }

    if (quantity > env.maxQuantityPerItem) {
        throw new AppError(409, `Số lượng tối đa cho phép cho mỗi sản phẩm trong giỏ là ${env.maxQuantityPerItem}`, {
            requested: quantity,
            max: env.maxQuantityPerItem,
        });
    }

    await cartRepository.updateItemQuantity(cart.id, skuId, quantity);
    return getCart(userId);
}

// ---------------------------------------------------------------------------
// DELETE /api/cart/items/:skuId — bỏ hẳn 1 sản phẩm khỏi giỏ.
// ---------------------------------------------------------------------------
async function removeItem(userId, skuId) {
    const cart = await getOrCreateCart(userId);
    const removed = await cartRepository.deleteItem(cart.id, skuId);
    if (!removed) {
        throw new AppError(404, 'Sản phẩm này không có trong giỏ hàng');
    }

    return getCart(userId);
}

// ---------------------------------------------------------------------------
// DELETE /api/cart — dọn sạch giỏ hàng (ví dụ: sau khi đặt hàng thành công, hoặc khách tự xóa hết).
// ---------------------------------------------------------------------------
async function clearCart(userId) {
    const cart = await getOrCreateCart(userId);
    await cartRepository.deleteAllItems(cart.id);
    return getCart(userId);
}

// ---------------------------------------------------------------------------
// Đồng bộ "bản sao đọc" tên/giá sản phẩm từ sự kiện Kafka 'product-events' do Product Service phát ra —
// để Cart Service tính tiền mà không phải gọi HTTP sang Product Service mỗi lần khách mở giỏ hàng.
// ---------------------------------------------------------------------------
async function syncFromProductEvent(envelope) {
    const { eventType, data } = envelope;

    switch (eventType) {
        case 'product.created':
        case 'product.updated':
            for (const variant of data.variants) {
                await cartRepository.upsertSnapshot({
                    skuId: variant.skuId,
                    skuCode: variant.skuCode,
                    productId: data.productId,
                    productName: data.name,
                    productSlug: data.slug,
                    price: variant.price,
                    compareAtPrice: variant.compareAtPrice,
                    status: data.status,
                });
            }
            console.log(`[Sync] Đã đồng bộ ${data.variants.length} SKU từ sự kiện ${eventType} (productId=${data.productId})`);
            break;

        case 'product.deleted':
            await cartRepository.markSnapshotsDiscontinued(data.skuIds);
            console.log(`[Sync] Đã đánh dấu ngừng kinh doanh ${data.skuIds.length} SKU từ sự kiện ${eventType} (productId=${data.productId})`);
            break;

        default:
            console.warn(`[Sync] Bỏ qua eventType không xác định: ${eventType}`);
    }
}

module.exports = {
    getCart,
    addItem,
    updateItemQuantity,
    removeItem,
    clearCart,
    syncFromProductEvent,
};
