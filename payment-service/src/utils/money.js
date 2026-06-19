// Toàn bộ tiền trong hệ thống tính bằng đơn vị "đồng" (VND, không có phần thập phân lưu hành thực tế) —
// làm tròn về số nguyên ở mọi bước cộng/nhân để tránh sai số dấu phẩy động cộng dồn qua nhiều dòng.
function toMoney(value) {
    return Math.round(Number(value));
}

module.exports = { toMoney };
