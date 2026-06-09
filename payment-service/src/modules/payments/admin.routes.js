const { Router } = require('express');
const { authenticate, authorize } = require('../../middlewares/authenticate');
const validate = require('../../middlewares/validate');
const schema = require('./payment.validation');
const controller = require('./admin.controller');

const router = Router();

// Toàn bộ route quản trị giao dịch thanh toán: bắt buộc đăng nhập VÀ phải có role ADMIN.
router.use(authenticate, authorize('ADMIN'));

router.get('/', validate(schema.adminPaymentsQuery, 'query'), controller.list);
router.get('/:id', validate(schema.idParam, 'params'), controller.getOne);

module.exports = router;
