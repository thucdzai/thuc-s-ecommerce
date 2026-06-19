const crypto = require('crypto');
const env = require('../../config/env');
const AppError = require('../../utils/AppError');
const { toMoney } = require('../../utils/money');
const { buildMeta } = require('../../utils/pagination');
const { buildPaymentUrl, verifySecureHash } = require('../../utils/vnpay');
const paymentRepository = require('./payment.repository');
const orderSnapshotRepository = require('./orderSnapshot.repository');
const paymentEvents = require('../../events/paymentEvents.publisher');

const PROVIDER = 'vnpay';
const URL_EXPIRE_MINUTES = 15;

function toPublicTransaction(row) {
    return {
        id: row.id,
        orderId: row.order_id,
        orderCode: row.order_code,
        userId: row.user_id,
        amount: Number(row.amount),
        provider: row.provider,
        txnRef: row.txn_ref,
        status: row.status,
        bankCode: row.bank_code,
        providerTransactionId: row.provider_transaction_id,
        paidAt: row.paid_at,
        expiresAt: row.expires_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

// Sinh mã tham chiếu giao dịch (vnp_TxnRef) DUY NHẤT cho mỗi lần khách bấm "Thanh toán" —
// ghép orderCode (để dễ tra cứu/đối soát) với hậu tố thời gian + ngẫu nhiên (để khách có thể
// tạo lại URL nhiều lần cho cùng 1 đơn — vd lần trước hết hạn — mà không đụng UNIQUE constraint).
function generateTxnRef(orderCode) {
    const suffix = `${Date.now().toString(36)}${crypto.randomBytes(2).toString('hex')}`.toUpperCase();
    return `${orderCode}-${suffix}`;
}

// ---------------------------------------------------------------------------
// POST /api/payments/vnpay/create-url — điểm khởi đầu của luồng thanh toán:
//   1) Tra đơn hàng từ "bản sao đọc" order_snapshots (đồng bộ qua Kafka 'order-events') —
//      KHÔNG nhận amount từ FE, tự chốt số tiền chính thức từ bản ghi đơn đã được Order Service xác nhận.
//   2) Chỉ cho tạo URL khi đơn đang ở 'pending_payment' và đúng là đơn của khách đang đăng nhập.
//   3) Ghi 1 dòng payment_transactions trạng thái 'pending', sinh URL đã ký số gửi sang VNPay.
// Toàn bộ tính toán/chốt số tiền nằm ở đây — FE chỉ nhận `paymentUrl` và redirect, không có
// quyền can thiệp vào số tiền hay tham số giao dịch (đúng nguyên tắc khép kín ở Backend).
// ---------------------------------------------------------------------------
async function createVnpayUrl(user, orderCode, ipAddr) {
    const snapshot = await orderSnapshotRepository.findByOrderCode(orderCode);
    if (!snapshot || snapshot.user_id !== user.id) {
        throw new AppError(404, `Không tìm thấy đơn hàng với mã ${orderCode}`);
    }
    if (snapshot.status !== 'pending_payment') {
        throw new AppError(409, `Đơn hàng đang ở trạng thái "${snapshot.status}", không thể tạo thanh toán mới`, {
            currentStatus: snapshot.status,
        });
    }

    const amount = toMoney(snapshot.total_amount);
    const txnRef = generateTxnRef(orderCode);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + URL_EXPIRE_MINUTES * 60 * 1000);

    await paymentRepository.insertTransaction({
        orderId: snapshot.order_id,
        orderCode,
        userId: user.id,
        amount,
        provider: PROVIDER,
        txnRef,
        status: 'pending',
        expiresAt,
    });

    const paymentUrl = buildPaymentUrl({
        tmnCode: env.vnpay.tmnCode,
        hashSecret: env.vnpay.hashSecret,
        payUrl: env.vnpay.payUrl,
        returnUrl: env.vnpay.returnUrl,
        txnRef,
        amount,
        orderInfo: `Thanh toan don hang ${orderCode}`,
        ipAddr,
        createdAt: now,
        expireMinutes: URL_EXPIRE_MINUTES,
    });

    return { paymentUrl, txnRef, amount, expiresAt };
}

// ---------------------------------------------------------------------------
// GET /api/payments/vnpay/ipn — webhook QUAN TRỌNG NHẤT của cả luồng thanh toán: đây là nguồn
// XÁC THỰC DUY NHẤT cho việc "khách đã thanh toán thật hay chưa" — Return URL (khách quay về sau
// khi thanh toán) chỉ để hiển thị, KHÔNG được dùng để xác nhận kết quả vì khách có thể đóng trình
// duyệt giữa chừng hoặc tự ý sửa query string. VNPay sẽ tự động gọi lại IPN nếu BE không phản hồi
// đúng định dạng {RspCode, Message} mà tài liệu VNPay quy định — nên LUÔN trả JSON, KHÔNG throw.
//
// Các bước theo đúng checklist bảo mật VNPay khuyến cáo:
//   1) Xác thực chữ ký (vnp_SecureHash) — từ chối ngay nếu sai, vì đây có thể là request giả mạo
//   2) Tìm giao dịch theo vnp_TxnRef — báo "không tìm thấy đơn" nếu không có
//   3) Đối chiếu số tiền (vnp_Amount/100 phải khớp số tiền BE đã chốt khi tạo URL)
//   4) Khóa dòng giao dịch (FOR UPDATE) + kiểm tra còn 'pending' — chặn xử lý trùng khi VNPay retry IPN
//   5) Ghi nhận kết quả + phát sự kiện cho Order Service — CHỈ MỘT LẦN nhờ bước 4
// ---------------------------------------------------------------------------
async function handleVnpayIpn(query) {
    if (!verifySecureHash(query, env.vnpay.hashSecret)) {
        return { RspCode: '97', Message: 'Invalid signature' };
    }

    const txnRef = query.vnp_TxnRef;
    const transaction = await paymentRepository.findByTxnRef(txnRef);
    if (!transaction) {
        return { RspCode: '01', Message: 'Order not found' };
    }

    const receivedAmount = toMoney(Number(query.vnp_Amount) / 100);
    if (receivedAmount !== Number(transaction.amount)) {
        return { RspCode: '04', Message: 'Invalid amount' };
    }

    if (transaction.status !== 'pending') {
        // Đã xử lý ở lần gọi IPN trước (VNPay có cơ chế tự động gọi lại) — báo đã xác nhận, KHÔNG xử lý lại.
        return { RspCode: '02', Message: 'Order already confirmed' };
    }

    const isSuccess = query.vnp_ResponseCode === '00' && query.vnp_TransactionStatus === '00';
    const nextStatus = isSuccess ? 'success' : 'failed';
    const paidAt = isSuccess ? new Date() : null;

    await paymentRepository.withTransaction(async (connection) => {
        const locked = await paymentRepository.findByTxnRefForUpdate(connection, txnRef);
        if (!locked || locked.status !== 'pending') {
            // Trường hợp hiếm: 2 IPN trùng đến gần như đồng thời, request kia đã thắng trong lúc ta verify ở trên.
            throw new AppError(409, 'Giao dịch đã được xử lý');
        }

        await paymentRepository.updateResultByTxnRef(connection, txnRef, {
            status: nextStatus,
            bankCode: query.vnp_BankCode || null,
            providerTransactionId: query.vnp_TransactionNo || null,
            providerResponse: JSON.stringify(query),
            paidAt,
        });
    });

    const updated = await paymentRepository.findByTxnRef(txnRef);
    const transactionForEvent = {
        id: updated.id,
        orderCode: updated.order_code,
        userId: updated.user_id,
        amount: Number(updated.amount),
        provider: updated.provider,
        providerTransactionId: updated.provider_transaction_id,
        paidAt: updated.paid_at,
    };

    if (isSuccess) {
        await paymentEvents.publishPaymentSucceeded(transactionForEvent);
    } else {
        await paymentEvents.publishPaymentFailed(transactionForEvent, `VNPay trả về vnp_ResponseCode=${query.vnp_ResponseCode}`);
    }

    return { RspCode: '00', Message: 'Confirm Success' };
}

// ---------------------------------------------------------------------------
// GET /api/payments/me — lịch sử giao dịch thanh toán của chính khách, BE tự lọc + phân trang.
// ---------------------------------------------------------------------------
async function listMyPayments(userId, query, pagination) {
    const filters = { userId, status: query.status };
    const [rows, totalItems] = await Promise.all([
        paymentRepository.list(filters, pagination),
        paymentRepository.count(filters),
    ]);

    return {
        items: rows.map(toPublicTransaction),
        meta: buildMeta(pagination.page, pagination.limit, totalItems),
    };
}

// ---------------------------------------------------------------------------
// GET /api/payments/me/:orderCode — trạng thái thanh toán hiện tại của 1 đơn (giao dịch mới nhất),
// chỉ trả về nếu đúng là đơn của khách đang đăng nhập.
// ---------------------------------------------------------------------------
async function getMyPaymentDetail(userId, orderCode) {
    const transaction = await paymentRepository.findLatestByOrderCode(orderCode);
    if (!transaction || transaction.user_id !== userId) {
        throw new AppError(404, `Không tìm thấy giao dịch thanh toán cho đơn hàng ${orderCode}`);
    }
    return toPublicTransaction(transaction);
}

// ---------------------------------------------------------------------------
// Quản trị (Admin) — xem toàn bộ giao dịch thanh toán trong hệ thống, phục vụ đối soát.
// ---------------------------------------------------------------------------
async function listPaymentsAdmin(query, pagination) {
    const filters = { userId: query.userId, orderCode: query.orderCode, status: query.status };
    const [rows, totalItems] = await Promise.all([
        paymentRepository.list(filters, pagination),
        paymentRepository.count(filters),
    ]);

    return {
        items: rows.map(toPublicTransaction),
        meta: buildMeta(pagination.page, pagination.limit, totalItems),
    };
}

async function getPaymentDetailAdmin(id) {
    const transaction = await paymentRepository.findById(id);
    if (!transaction) {
        throw new AppError(404, 'Không tìm thấy giao dịch thanh toán');
    }
    return toPublicTransaction(transaction);
}

module.exports = {
    createVnpayUrl,
    handleVnpayIpn,
    listMyPayments,
    getMyPaymentDetail,
    listPaymentsAdmin,
    getPaymentDetailAdmin,
};
