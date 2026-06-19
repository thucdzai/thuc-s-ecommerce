const AppError = require('./AppError');

// Wrapper mỏng quanh `fetch` (có sẵn từ Node 18) cho lệnh gọi HTTP đồng bộ sang Auth Service
// để tra cứu email/tên người nhận — cùng pattern với postJson trong order-service/src/utils/httpClient.js,
// chỉ khác là Notification Service chỉ cần GET.
async function getJson(baseUrl, path, { accessToken, timeoutMs = 5000 } = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let response;
    try {
        response = await fetch(`${baseUrl}${path}`, {
            method: 'GET',
            headers: {
                ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
            },
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
        const statusCode = response.status >= 400 && response.status < 500 ? response.status : 502;
        throw new AppError(statusCode, message, json?.details || null);
    }

    return json?.data ?? null;
}

module.exports = { getJson };
