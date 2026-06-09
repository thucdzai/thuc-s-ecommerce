const AppError = require('../../utils/AppError');
const { toMoney } = require('../../utils/money');
const { buildMeta } = require('../../utils/pagination');
const promotionRepository = require('./promotion.repository');

function toPublicPromotion(row) {
    return {
        id: row.id,
        code: row.code,
        description: row.description,
        discountType: row.discount_type,
        discountValue: Number(row.discount_value),
        maxDiscountAmount: row.max_discount_amount !== null ? Number(row.max_discount_amount) : null,
        minOrderAmount: Number(row.min_order_amount),
        usageLimit: row.usage_limit,
        usedCount: row.used_count,
        startsAt: row.starts_at,
        endsAt: row.ends_at,
        status: row.status,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

// ---------------------------------------------------------------------------
// Tính số tiền được giảm dựa trên loại khuyến mãi — CHỈ MỘT nơi duy nhất trong toàn hệ thống
// thực hiện phép tính này (BE khép kín), Order Service và endpoint preview đều gọi lại đúng hàm này
// để đảm bảo số preview FE thấy trước khi đặt hàng luôn khớp với số tiền chốt thật lúc checkout.
// ---------------------------------------------------------------------------
function calculateDiscountAmount(promotion, subtotalAmount) {
    if (promotion.discount_type === 'percentage') {
        const raw = (subtotalAmount * Number(promotion.discount_value)) / 100;
        const capped = promotion.max_discount_amount !== null
            ? Math.min(raw, Number(promotion.max_discount_amount))
            : raw;
        return toMoney(Math.min(capped, subtotalAmount));
    }

    // 'fixed': giảm thẳng 1 số tiền cố định, không bao giờ vượt quá giá trị đơn hàng.
    return toMoney(Math.min(Number(promotion.discount_value), subtotalAmount));
}

// ---------------------------------------------------------------------------
// Kiểm tra điều kiện áp dụng — dùng chung cho cả "preview" (xem trước mức giảm) và
// "checkout" (chốt đơn thật). Validate càng sớm càng tốt để khách biết lý do bị từ chối ngay,
// thay vì chỉ phát hiện ra lúc bấm đặt hàng.
// ---------------------------------------------------------------------------
function assertApplicable(promotion, subtotalAmount) {
    if (!promotion) {
        throw new AppError(404, 'Mã khuyến mãi không tồn tại');
    }
    if (promotion.status !== 'active') {
        throw new AppError(409, 'Mã khuyến mãi hiện không khả dụng');
    }

    const now = new Date();
    if (now < new Date(promotion.starts_at)) {
        throw new AppError(409, 'Mã khuyến mãi chưa đến thời gian áp dụng');
    }
    if (now > new Date(promotion.ends_at)) {
        throw new AppError(409, 'Mã khuyến mãi đã hết hạn sử dụng');
    }
    if (promotion.usage_limit !== null && promotion.used_count >= promotion.usage_limit) {
        throw new AppError(409, 'Mã khuyến mãi đã hết lượt sử dụng');
    }
    if (subtotalAmount < Number(promotion.min_order_amount)) {
        throw new AppError(409, `Đơn hàng cần tối thiểu ${toMoney(promotion.min_order_amount).toLocaleString('vi-VN')}đ để áp dụng mã này`, {
            minOrderAmount: Number(promotion.min_order_amount),
            subtotalAmount,
        });
    }
}

// ---------------------------------------------------------------------------
// POST /api/promotions/preview — FE gửi mã + subtotal (đã được Cart Service tính sẵn) để
// xem trước số tiền được giảm TRƯỚC khi bấm đặt hàng, tránh phải checkout thử rồi mới biết.
// ---------------------------------------------------------------------------
async function preview(code, subtotalAmount) {
    const promotion = await promotionRepository.findByCode(code);
    assertApplicable(promotion, subtotalAmount);

    const discountAmount = calculateDiscountAmount(promotion, subtotalAmount);
    return {
        code: promotion.code,
        description: promotion.description,
        discountAmount,
        estimatedTotal: Math.max(0, subtotalAmount - discountAmount),
    };
}

// ---------------------------------------------------------------------------
// Dùng nội bộ bởi order.service khi checkout — chạy TRONG transaction với khóa FOR UPDATE
// để chặn race condition khi nhiều đơn cùng lúc tranh nhau dùng nốt lượt cuối của 1 mã giới hạn.
// ---------------------------------------------------------------------------
async function lockAndValidateForCheckout(connection, code, subtotalAmount) {
    const promotion = await promotionRepository.findByCodeForUpdate(connection, code);
    assertApplicable(promotion, subtotalAmount);
    return { promotion, discountAmount: calculateDiscountAmount(promotion, subtotalAmount) };
}

// ---------------------------------------------------------------------------
// Quản trị (Admin) — CRUD mã khuyến mãi. Không cho đổi `code` sau khi tạo để tránh phá vỡ
// tham chiếu `promotion_code` đã chụp lại trong các đơn hàng cũ.
// ---------------------------------------------------------------------------
async function listPromotions(query, pagination) {
    const filters = { status: query.status, code: query.code };
    const [items, totalItems] = await Promise.all([
        promotionRepository.list(filters, pagination),
        promotionRepository.count(filters),
    ]);
    return { items: items.map(toPublicPromotion), meta: buildMeta(pagination.page, pagination.limit, totalItems) };
}

async function getPromotionById(id) {
    const promotion = await promotionRepository.findById(id);
    if (!promotion) {
        throw new AppError(404, 'Không tìm thấy mã khuyến mãi');
    }
    return toPublicPromotion(promotion);
}

async function createPromotion(payload) {
    const existing = await promotionRepository.findByCode(payload.code);
    if (existing) {
        throw new AppError(409, 'Mã khuyến mãi này đã tồn tại');
    }

    const id = await promotionRepository.create(payload);
    return getPromotionById(id);
}

async function updatePromotion(id, payload) {
    const existing = await promotionRepository.findById(id);
    if (!existing) {
        throw new AppError(404, 'Không tìm thấy mã khuyến mãi');
    }

    await promotionRepository.update(id, payload);
    return getPromotionById(id);
}

module.exports = {
    toPublicPromotion,
    calculateDiscountAmount,
    preview,
    lockAndValidateForCheckout,
    listPromotions,
    getPromotionById,
    createPromotion,
    updatePromotion,
};
