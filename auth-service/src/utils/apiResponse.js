// Chuẩn hóa khung trả về cho mọi API — FE chỉ cần đọc theo một format duy nhất.
function ok(res, data = null, message = 'OK', statusCode = 200) {
    return res.status(statusCode).json({ success: true, message, data });
}

function created(res, data = null, message = 'Created') {
    return ok(res, data, message, 201);
}

function paginated(res, data, pagination, message = 'OK') {
    return res.status(200).json({ success: true, message, data, pagination });
}

module.exports = { ok, created, paginated };
