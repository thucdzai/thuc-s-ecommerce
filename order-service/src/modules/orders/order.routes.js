const { Router } = require('express');
const { authenticate } = require('../../middlewares/authenticate');
const validate = require('../../middlewares/validate');
const schema = require('./order.validation');
const controller = require('./order.controller');

const router = Router();

// Toàn bộ route đặt/xem đơn đều gắn với người dùng đã đăng nhập.
router.use(authenticate);

// QUAN TRỌNG: '/me' phải khai báo TRƯỚC '/me/:id' — và cả hai phải đứng trước mọi route
// dạng '/:id' nếu có, để tránh Express hiểu nhầm "me" là 1 giá trị id (đúng bài học đã ghi nhận
// ở Warehouse Service với cặp '/logs' vs '/:skuId').
router.get('/me', validate(schema.myOrdersQuery, 'query'), controller.listMine);
router.get('/me/:id', validate(schema.idParam, 'params'), controller.getMine);
router.post('/checkout', validate(schema.checkoutBody), controller.checkout);

module.exports = router;
