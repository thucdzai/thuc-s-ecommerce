function ok(res, data = null, message = 'OK', statusCode = 200) {
    return res.status(statusCode).json({ success: true, message, data });
}

function created(res, data = null, message = 'Created') {
    return ok(res, data, message, 201);
}

// Khung trả về riêng cho danh sách có phân trang — FE chỉ cần đọc `items` và `pagination` để vẽ giao diện,
// không phải tự tính tổng số trang hay vị trí offset.
function paginated(res, items, pagination, message = 'OK') {
    return res.status(200).json({ success: true, message, data: items, pagination });
}

module.exports = { ok, created, paginated };
