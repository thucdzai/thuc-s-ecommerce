const { Router } = require('express');
const { authenticate, authorize } = require('../../middlewares/authenticate');
const validate = require('../../middlewares/validate');
const schema = require('./promotion.validation');
const controller = require('./admin.controller');

const router = Router();

// Toàn bộ route quản trị khuyến mãi: bắt buộc đăng nhập VÀ phải có role ADMIN.
router.use(authenticate, authorize('ADMIN'));

// QUAN TRỌNG: '/' (list) phải đứng trước '/:id' theo thứ tự khai báo bên dưới — Express khớp
// theo thứ tự đăng ký, nhưng route literal vs param không xung đột ở đây vì khác phương thức/độ sâu.
// Vẫn giữ đúng thói quen khai báo literal trước param để nhất quán với Warehouse Service.
router.get('/', validate(schema.listQuery, 'query'), controller.list);
router.post('/', validate(schema.createBody), controller.create);
router.get('/:id', validate(schema.idParam, 'params'), controller.getOne);
router.put('/:id', validate(schema.idParam, 'params'), validate(schema.updateBody), controller.update);

module.exports = router;
