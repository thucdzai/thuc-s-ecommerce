const { Router } = require('express');
const { authenticate } = require('../../middlewares/authenticate');
const validate = require('../../middlewares/validate');
const schema = require('./cart.validation');
const controller = require('./cart.controller');

const router = Router();

// Giỏ hàng luôn thuộc về 1 người dùng cụ thể — toàn bộ route bắt buộc đăng nhập,
// không có khái niệm "giỏ hàng khách vãng lai" trong phạm vi service này.
router.use(authenticate);

router.get('/', controller.getCart);
router.delete('/', controller.clearCart);

router.post('/items', validate(schema.addItemBody), controller.addItem);
router.patch('/items/:skuId', validate(schema.skuIdParam, 'params'), validate(schema.updateItemBody), controller.updateItem);
router.delete('/items/:skuId', validate(schema.skuIdParam, 'params'), controller.removeItem);

module.exports = router;
