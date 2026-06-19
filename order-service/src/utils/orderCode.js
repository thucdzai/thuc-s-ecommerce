// Sinh mã đơn hàng dễ đọc, duy nhất theo thời gian + hậu tố ngẫu nhiên — dùng làm `orderId` khi gọi
// sang Warehouse Service (lock/release/deduct) và hiển thị cho khách thay vì lộ khóa chính dạng số.
function generateOrderCode(now = new Date()) {
    const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
    const randomPart = Math.random().toString(36).slice(2, 8).toUpperCase();
    return `ORD${datePart}${randomPart}`;
}

module.exports = { generateOrderCode };
