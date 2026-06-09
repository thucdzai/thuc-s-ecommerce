const { Router } = require('express');
const { authenticate } = require('../../middlewares/authenticate');
const validate = require('../../middlewares/validate');
const schema = require('./promotion.validation');
const controller = require('./promotion.controller');

const router = Router();

// Yêu cầu đăng nhập (giống Cart) — xem trước mức giảm gắn liền với phiên mua hàng của khách.
router.post('/preview', authenticate, validate(schema.previewBody), controller.preview);

module.exports = router;
