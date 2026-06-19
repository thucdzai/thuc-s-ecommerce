const kafka = require('../config/kafka');
const { PAYMENT_EVENTS } = require('./topics');

// Phát kết quả thanh toán lên Kafka — Order Service lắng nghe để TỰ ĐỘNG chuyển đơn từ
// 'pending_payment' sang 'paid' (và trừ kho thật) khi VNPay xác nhận giao dịch thành công qua IPN,
// thay cho việc Admin phải xác nhận thủ công (giải pháp tạm thời đã ghi chú trong order.service.js).
// Cùng triết lý "giảm coupling" — Payment Service không gọi ngược API của Order Service.

async function publishPaymentSucceeded(transaction) {
    await kafka.publishEvent(PAYMENT_EVENTS, 'payment.succeeded', {
        transactionId: transaction.id,
        orderCode: transaction.orderCode,
        userId: transaction.userId,
        amount: transaction.amount,
        provider: transaction.provider,
        providerTransactionId: transaction.providerTransactionId,
        paidAt: transaction.paidAt,
    }, transaction.orderCode);
}

async function publishPaymentFailed(transaction, reason) {
    await kafka.publishEvent(PAYMENT_EVENTS, 'payment.failed', {
        transactionId: transaction.id,
        orderCode: transaction.orderCode,
        userId: transaction.userId,
        amount: transaction.amount,
        provider: transaction.provider,
        reason,
    }, transaction.orderCode);
}

module.exports = { publishPaymentSucceeded, publishPaymentFailed };
