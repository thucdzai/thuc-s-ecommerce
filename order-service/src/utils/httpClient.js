const AppError = require('./AppError');

// Wrapper mỏng quanh `fetch` (có sẵn từ Node 18, không cần thêm dependency) cho các lệnh gọi
// HTTP đồng bộ liên-service. Đây là lần đầu Order Service cần gọi "ngang" sang service khác
// (Warehouse) trong vòng đời 1 request — khác với Cart/Warehouse vốn chỉ đồng bộ qua Kafka.
//
// Mọi lỗi mạng (service kia sập/timeout) đều được quy về AppError(502) để errorHandler xử lý
// thống nhất; lỗi nghiệp vụ (4xx) từ service kia được giữ nguyên statusCode + message gốc.
async function postJson(baseUrl, path, body, { accessToken, timeoutMs = 5000 } = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let response;
    try {
        response = await fetch(`${baseUrl}${path}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
            },
            body: JSON.stringify(body),
            signal: controller.signal,
        });
    } catch (err) {
        throw new AppError(502, `Không thể kết nối tới dịch vụ liên quan (${baseUrl}): ${err.message}`);
    } finally {
        clearTimeout(timer);
    }

    const json = await response.json().catch(() => null);

    if (!response.ok) {
        const message = json?.message || `Dịch vụ liên quan trả về lỗi (HTTP ${response.status})`;
        // Giữ nguyên statusCode nghiệp vụ (404/409/422...) để Order Service phản ánh đúng
        // nguyên nhân cho khách (vd: "không đủ hàng"); các lỗi hạ tầng (5xx) quy thành 502.
        const statusCode = response.status >= 400 && response.status < 500 ? response.status : 502;
        throw new AppError(statusCode, message, json?.details || null);
    }

    return json?.data ?? null;
}

module.exports = { postJson };
