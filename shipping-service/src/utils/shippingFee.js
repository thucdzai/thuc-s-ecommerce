const env = require('../config/env');

const BASE_WEIGHT_KG = 0.5;          // Mốc cân nặng đầu tiên đã bao gồm trong phí cơ bản
const SURCHARGE_PER_STEP = 5000;     // Phụ phí cho mỗi 0.5kg vượt mốc
const OUTER_ZONE_SURCHARGE = 11000;  // Phụ phí khi giao ngoài khu vực nội thành

// Nhận diện "khu vực nội thành" bằng cách so khớp các từ khóa cấu hình (tên tỉnh/thành) trong
// địa chỉ giao hàng — KHÔNG gọi API địa lý thật. Đây là mock đơn giản nhưng đủ để minh họa đúng
// công thức "phí cơ bản + phụ phí cân nặng + phụ phí khu vực" mà GHTK/GHN niêm yết trong bảng giá.
function detectZone(address) {
    const normalized = (address || '').toLowerCase();
    const isInner = env.shipping.innerZoneKeywords.some((keyword) => normalized.includes(keyword));
    return isInner ? 'inner' : 'outer';
}

// Hàm tính phí DUY NHẤT — dùng chung cho cả API xem trước "/calculate-fee" (FE gọi để hiển thị
// ước tính) lẫn lúc Shipping Service tự tạo vận đơn khi đơn chuyển sang 'processing', đảm bảo
// 2 nơi luôn ra cùng 1 con số cho cùng 1 input.
function calculateFee({ address, weightKg }) {
    const zone = detectZone(address);
    const extraWeight = Math.max(0, weightKg - BASE_WEIGHT_KG);
    const weightSurcharge = Math.ceil(extraWeight / BASE_WEIGHT_KG) * SURCHARGE_PER_STEP;
    const zoneSurcharge = zone === 'outer' ? OUTER_ZONE_SURCHARGE : 0;
    const fee = env.shipping.baseFee + weightSurcharge + zoneSurcharge;

    return { fee, zone, baseFee: env.shipping.baseFee, weightSurcharge, zoneSurcharge, weightKg };
}

module.exports = { calculateFee, detectZone };
