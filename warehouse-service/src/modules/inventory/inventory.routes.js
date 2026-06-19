const { Router } = require('express');
const { authenticate, authorize } = require('../../middlewares/authenticate');
const validate = require('../../middlewares/validate');
const schema = require('./inventory.validation');
const controller = require('./inventory.controller');

const router = Router();

// QUAN TRỌNG: '/logs' phải khai báo TRƯỚC '/:skuId', nếu không Express sẽ hiểu "logs"
// là một giá trị skuId (và Joi sẽ chặn lại với lỗi 422 vì "logs" không phải số nguyên).

// Lịch sử biến động kho — chỉ Admin mới xem được sổ cái xuất/nhập/giữ chỗ toàn hệ thống.
router.get('/logs', authenticate, authorize('ADMIN'), validate(schema.logsQuery, 'query'), controller.listLogs);

// Đọc tồn kho theo SKU — public, FE có thể hiển thị "còn X sản phẩm" ngay trên trang chi tiết.
router.get('/:skuId', validate(schema.skuIdParam, 'params'), controller.getBySkuId);

// Các thao tác làm thay đổi số lượng đều bắt buộc đăng nhập — do Order/Payment Service
// gọi sang khi xử lý luồng đặt hàng/thanh toán (forward token của người dùng).
router.post('/lock', authenticate, validate(schema.lockBody), controller.lock);
router.post('/release', authenticate, validate(schema.releaseBody), controller.release);
router.post('/deduct', authenticate, validate(schema.deductBody), controller.deduct);

module.exports = router;
