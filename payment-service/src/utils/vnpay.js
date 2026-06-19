const crypto = require('crypto');

// ---------------------------------------------------------------------------
// Tiện ích ký số / xác thực chữ ký cho cổng thanh toán VNPay — theo ĐÚNG thuật toán VNPay
// công bố trong tài liệu tích hợp chính thức:
//   1) Lấy toàn bộ tham số (trừ vnp_SecureHash, vnp_SecureHashType), SẮP XẾP key theo thứ tự
//      bảng chữ cái, encode key & value bằng encodeURIComponent rồi nối thành "key=value&...".
//   2) Ký chuỗi đó bằng HMAC-SHA512 với Hash Secret do VNPay cấp cho merchant.
// Áp dụng CHÍNH XÁC cùng một hàm `buildSignedQuery` cho cả lúc TẠO URL thanh toán lẫn lúc
// XÁC THỰC chữ ký ở IPN — đảm bảo tự nhất quán dù chưa có Hash Secret thật từ VNPay sandbox
// (chỉ cần đổi VNPAY_HASH_SECRET trong .env khi có tài khoản merchant thật).
// ---------------------------------------------------------------------------

function buildSignedQuery(params, hashSecret) {
    const sortedKeys = Object.keys(params)
        .filter((key) => params[key] !== undefined && params[key] !== null && params[key] !== '')
        .sort();

    const queryString = sortedKeys
        .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
        .join('&');

    const secureHash = crypto
        .createHmac('sha512', hashSecret)
        .update(Buffer.from(queryString, 'utf-8'))
        .digest('hex');

    return { queryString, secureHash };
}

// VNPay yêu cầu định dạng ngày giờ "yyyyMMddHHmmss", tính theo giờ Việt Nam (GMT+7).
function formatVnpDate(date) {
    const vnTime = new Date(date.getTime() + 7 * 60 * 60 * 1000);
    return vnTime.toISOString().slice(0, 19).replace(/[-T:]/g, '');
}

// ---------------------------------------------------------------------------
// Dựng URL thanh toán theo Pay API v2.1.0 — FE chỉ cần redirect khách sang `paymentUrl`,
// KHÔNG được tự build hay chỉnh sửa bất kỳ tham số nào (đúng nguyên tắc khép kín ở Backend:
// số tiền/Mã đơn/chữ ký đều do BE chốt, FE không có quyền can thiệp vào giao dịch tiền thật).
// ---------------------------------------------------------------------------
function buildPaymentUrl({ tmnCode, hashSecret, payUrl, returnUrl, txnRef, amount, orderInfo, ipAddr, createdAt, expireMinutes = 15 }) {
    const createDate = formatVnpDate(createdAt);
    const expireDate = formatVnpDate(new Date(createdAt.getTime() + expireMinutes * 60 * 1000));

    const params = {
        vnp_Version: '2.1.0',
        vnp_Command: 'pay',
        vnp_TmnCode: tmnCode,
        // VNPay yêu cầu số tiền tính theo đơn vị nhỏ nhất (x100) và KHÔNG có phần thập phân.
        vnp_Amount: Math.round(amount) * 100,
        vnp_CurrCode: 'VND',
        vnp_TxnRef: txnRef,
        vnp_OrderInfo: orderInfo,
        vnp_OrderType: 'other',
        vnp_Locale: 'vn',
        vnp_ReturnUrl: returnUrl,
        vnp_IpAddr: ipAddr,
        vnp_CreateDate: createDate,
        vnp_ExpireDate: expireDate,
    };

    const { queryString, secureHash } = buildSignedQuery(params, hashSecret);
    return `${payUrl}?${queryString}&vnp_SecureHash=${secureHash}`;
}

// ---------------------------------------------------------------------------
// Xác thực chữ ký của dữ liệu IPN/Return mà VNPay gửi về — TUYỆT ĐỐI không được tin bất kỳ
// trường nào (đặc biệt vnp_ResponseCode/vnp_Amount) nếu chữ ký không khớp, vì đây là bước
// duy nhất đảm bảo request thật sự đến từ VNPay chứ không phải kẻ giả mạo gọi thẳng vào IPN URL.
// ---------------------------------------------------------------------------
function verifySecureHash(query, hashSecret) {
    const { vnp_SecureHash: receivedHash, vnp_SecureHashType, ...rest } = query;
    if (!receivedHash) return false;

    const { secureHash } = buildSignedQuery(rest, hashSecret);
    return secureHash.toLowerCase() === String(receivedHash).toLowerCase();
}

module.exports = { buildPaymentUrl, verifySecureHash, formatVnpDate };
