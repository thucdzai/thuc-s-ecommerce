const asyncHandler = require('../../utils/asyncHandler');
const { ok, paginated } = require('../../utils/apiResponse');
const { parsePagination } = require('../../utils/pagination');
const paymentService = require('./payment.service');

// POST /api/payments/vnpay/create-url — sinh URL thanh toán VNPay cho 1 đơn đang chờ thanh toán.
// Lấy IP thực của khách để gửi kèm vnp_IpAddr (VNPay dùng để đối soát/chống gian lận).
const createVnpayUrl = asyncHandler(async (req, res) => {
    const ipAddr = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1').split(',')[0].trim();
    const result = await paymentService.createVnpayUrl(req.user, req.body.orderCode, ipAddr);
    return ok(res, result, 'Tạo URL thanh toán thành công');
});

// GET /api/payments/vnpay/ipn — webhook do chính VNPay gọi (server-to-server, không qua FE,
// không có Bearer token) để xác nhận kết quả giao dịch — PHẢI luôn trả JSON {RspCode, Message}
// theo đúng định dạng VNPay quy định, không dùng asyncHandler mặc định ném lỗi ra errorHandler chung.
const vnpayIpn = async (req, res) => {
    try {
        const result = await paymentService.handleVnpayIpn(req.query);
        return res.status(200).json(result);
    } catch (err) {
        console.error('[VNPay IPN] Lỗi xử lý:', err.message);
        return res.status(200).json({ RspCode: '99', Message: 'Unknown error' });
    }
};

const listMyPayments = asyncHandler(async (req, res) => {
    const pagination = parsePagination(req.query);
    const { items, meta } = await paymentService.listMyPayments(req.user.id, req.query, pagination);
    return paginated(res, items, meta, 'Lấy lịch sử giao dịch thành công');
});

const getMyPaymentDetail = asyncHandler(async (req, res) => {
    const transaction = await paymentService.getMyPaymentDetail(req.user.id, req.params.orderCode);
    return ok(res, transaction, 'Lấy thông tin giao dịch thành công');
});

module.exports = { createVnpayUrl, vnpayIpn, listMyPayments, getMyPaymentDetail };
