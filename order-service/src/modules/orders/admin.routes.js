const { Router } = require('express');
const { authenticate, authorize } = require('../../middlewares/authenticate');
const validate = require('../../middlewares/validate');
const schema = require('./order.validation');
const controller = require('./admin.controller');

const router = Router();

// Toàn bộ route quản trị đơn hàng: bắt buộc đăng nhập VÀ phải có role ADMIN.
router.use(authenticate, authorize('ADMIN'));

router.get('/', validate(schema.adminOrdersQuery, 'query'), controller.list);
router.get('/:id', validate(schema.idParam, 'params'), controller.getOne);
router.put(
    '/:id/status',
    validate(schema.idParam, 'params'),
    validate(schema.updateStatusBody),
    controller.updateStatus
);

module.exports = router;
