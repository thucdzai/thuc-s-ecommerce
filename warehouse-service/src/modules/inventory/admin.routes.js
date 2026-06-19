const { Router } = require('express');
const { authenticate, authorize } = require('../../middlewares/authenticate');
const validate = require('../../middlewares/validate');
const schema = require('./inventory.validation');
const controller = require('./admin.controller');

const router = Router();

// Toàn bộ route quản trị kho: bắt buộc đăng nhập VÀ phải có role ADMIN.
router.use(authenticate, authorize('ADMIN'));

router.put(
    '/:skuId/adjust',
    validate(schema.skuIdParam, 'params'),
    validate(schema.adjustBody),
    controller.adjust
);

module.exports = router;
