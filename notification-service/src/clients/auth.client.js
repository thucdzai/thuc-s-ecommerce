const env = require('../config/env');
const { getJson } = require('../utils/httpClient');
const { mintSystemAccessToken } = require('../utils/systemToken');

// Tra cứu email/tên người nhận theo userId — cần cho các sự kiện order/payment/shipping vốn
// chỉ mang theo userId (không có email). Dùng "system token" vì không có access token thật
// của người dùng đi kèm sự kiện Kafka (xem GET /api/users/:id/contact, gated bởi authorize('SYSTEM')).
async function getUserContact(userId) {
    const systemToken = mintSystemAccessToken();
    return getJson(env.authServiceUrl, `/api/users/${userId}/contact`, { accessToken: systemToken });
}

module.exports = { getUserContact };
