const { Router } = require('express');
const { authenticate } = require('../../middlewares/authenticate');
const validate = require('../../middlewares/validate');
const schema = require('./payment.validation');
const controller = require('./payment.controller');

const router = Router();

// QUAN TRỌNG: '/vnpay/ipn' KHÔNG được đặt sau authenticate — VNPay gọi thẳng từ server của họ,
// không gắn Bearer token của bất kỳ ai. Đây là route DUY NHẤT trong toàn hệ thống không yêu cầu
// đăng nhập nhưng vẫn an toàn nhờ xác thực chữ ký vnp_SecureHash ở payment.service.js.
router.get('/vnpay/ipn', controller.vnpayIpn);

router.post('/vnpay/create-url', authenticate, validate(schema.createUrlBody), controller.createVnpayUrl);

router.get('/me', authenticate, validate(schema.myPaymentsQuery, 'query'), controller.listMyPayments);
router.get('/me/:orderCode', authenticate, validate(schema.orderCodeParam, 'params'), controller.getMyPaymentDetail);

module.exports = router;
