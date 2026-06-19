const crypto = require('crypto');

const CARRIERS = ['GHTK', 'GHN'];

// Chọn đơn vị vận chuyển — mock đơn giản bằng cách băm mã đơn để CHỌN ỔN ĐỊNH (cùng 1 đơn luôn
// ra cùng 1 hãng dù service có khởi động lại), không phụ thuộc may rủi như Math.random thuần túy.
function pickCarrier(orderCode) {
    const hash = crypto.createHash('md5').update(orderCode).digest('hex');
    const index = parseInt(hash.slice(0, 8), 16) % CARRIERS.length;
    return CARRIERS[index];
}

function generateTrackingCode(carrier) {
    const suffix = `${Date.now().toString(36)}${crypto.randomBytes(3).toString('hex')}`.toUpperCase();
    return `${carrier}${suffix}`;
}

// Mô phỏng việc gọi API "tạo vận đơn" của đơn vị vận chuyển (GHTK/GHN) — không có tài khoản API
// thật nên tự sinh mã vận đơn + thời gian giao dự kiến nhất quán theo orderCode, nhưng vẫn giữ
// đúng "hình dạng" phản hồi mà 1 lần tích hợp thật sẽ trả về để có thể thay thế bằng lệnh gọi
// HTTP thật sau này mà không phải đổi phần còn lại của service.
function createLabel({ orderCode, zone }) {
    const carrier = pickCarrier(orderCode);
    const trackingCode = generateTrackingCode(carrier);
    const estimatedDays = zone === 'inner' ? 2 : 4;

    return { carrier, trackingCode, estimatedDays };
}

module.exports = { pickCarrier, generateTrackingCode, createLabel };
