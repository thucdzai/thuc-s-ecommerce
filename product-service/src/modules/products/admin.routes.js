const { Router } = require('express');
const { authenticate, authorize } = require('../../middlewares/authenticate');
const validate = require('../../middlewares/validate');
const schema = require('./product.validation');
const controller = require('./admin.controller');

const router = Router();

// Toàn bộ route quản trị sản phẩm: bắt buộc đăng nhập VÀ phải có role ADMIN.
router.use(authenticate, authorize('ADMIN'));

router.get('/', validate(schema.adminListQuery, 'query'), controller.list);
router.post('/', validate(schema.createProduct), controller.create);
router.put('/:id', validate(schema.idParam, 'params'), validate(schema.updateProduct), controller.update);
router.delete('/:id', validate(schema.idParam, 'params'), controller.remove);

module.exports = router;
