const express = require('express');
const multer = require('multer');
const { Router } = require('express');
const { authenticate, authorize } = require('../../middlewares/authenticate');
const validate = require('../../middlewares/validate');
const schema = require('./user.validation');
const controller = require('./user.controller');
const { upload, UPLOAD_DIR } = require('./upload.storage');
const addressRoutes = require('../addresses/address.routes');
const AppError = require('../../utils/AppError');

const router = Router();

// Phục vụ ảnh đại diện đã tải lên — không cần đăng nhập vì URL chứa tên file ngẫu nhiên
router.use('/avatars', express.static(UPLOAD_DIR));

router.get('/profile', authenticate, controller.getProfile);
router.put('/profile', authenticate, validate(schema.updateProfile), controller.updateProfile);

// Wrapper bắt MulterError trả về 422 thay vì 500
function handleAvatarUpload(req, res, next) {
    upload.single('avatar')(req, res, (err) => {
        if (!err) return next();
        if (err instanceof multer.MulterError) {
            const msg = err.code === 'LIMIT_FILE_SIZE' ? 'Ảnh tối đa 2MB' : 'Tải ảnh lên thất bại';
            return next(new AppError(422, msg));
        }
        return next(err);
    });
}

router.post('/profile/avatar', authenticate, handleAvatarUpload, controller.uploadAvatar);

// Nội bộ: Notification Service tra cứu thông tin liên hệ qua "system token"
router.get('/:id/contact', authenticate, authorize('SYSTEM'), controller.getContactById);

// GET/POST /api/users/:userId/addresses, PUT/DELETE/PATCH
router.use('/:userId/addresses', addressRoutes);

module.exports = router;
