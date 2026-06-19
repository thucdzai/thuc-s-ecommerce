const env = require('../config/env');
const { postJson } = require('../utils/httpClient');

// Order Service điều phối (orchestrate) vòng đời tồn kho của một đơn hàng bằng cách gọi
// đồng bộ sang các API mà Warehouse Service đã mở sẵn cho "Order/Payment Service gọi khi xử lý
// luồng đặt hàng/thanh toán" (POST /api/inventory/lock|release|deduct — xem inventory.routes.js).
//
// Luôn forward Access Token của chính người dùng đang checkout — Warehouse Service chỉ verify
// chữ ký JWT dùng chung, không phân biệt "ai gọi", nên forward token gốc là đủ và đúng nhất quán.

function lockStock({ skuId, orderId, quantity }, accessToken) {
    return postJson(env.warehouseServiceUrl, '/api/inventory/lock', { skuId, orderId, quantity }, { accessToken });
}

function releaseStock({ skuId, orderId }, accessToken) {
    return postJson(env.warehouseServiceUrl, '/api/inventory/release', { skuId, orderId }, { accessToken });
}

function deductStock({ skuId, orderId, quantity }, accessToken) {
    return postJson(env.warehouseServiceUrl, '/api/inventory/deduct', { skuId, orderId, quantity }, { accessToken });
}

module.exports = { lockStock, releaseStock, deductStock };
