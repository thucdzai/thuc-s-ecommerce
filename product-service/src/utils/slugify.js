// Chuyển tên sản phẩm tiếng Việt có dấu thành slug URL-safe, vd: "Áo Thun Cotton" -> "ao-thun-cotton".
function slugify(text) {
    return text
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
}

module.exports = slugify;
