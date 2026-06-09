const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

// Chuẩn hóa tham số phân trang từ query string (?page=1&limit=20) thành { page, limit, offset }
// để Repository dùng trực tiếp trong LIMIT/OFFSET — đúng tinh thần "BE tự bù trừ SQL cho FE".
function parsePagination(query) {
    const page = Math.max(DEFAULT_PAGE, parseInt(query.page, 10) || DEFAULT_PAGE);
    const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(query.limit, 10) || DEFAULT_LIMIT));
    const offset = (page - 1) * limit;
    return { page, limit, offset };
}

// Đóng gói lại tổng số dòng thành { page, limit, totalItems, totalPages } để FE chỉ việc vẽ phân trang.
function buildMeta(page, limit, totalItems) {
    return {
        page,
        limit,
        totalItems,
        totalPages: Math.max(1, Math.ceil(totalItems / limit)),
    };
}

module.exports = { parsePagination, buildMeta };
