const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const AppError = require('../../utils/AppError');

const UPLOAD_DIR = path.join(__dirname, '..', '..', '..', 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024;

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
        cb(null, `avatar-${req.user?.id ?? 'u'}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`);
    },
});

function fileFilter(req, file, cb) {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        return cb(new AppError(422, 'Định dạng không hỗ trợ. Chỉ chấp nhận JPEG/PNG/WebP/GIF'));
    }
    return cb(null, true);
}

const upload = multer({ storage, fileFilter, limits: { fileSize: MAX_FILE_SIZE_BYTES, files: 1 } });

module.exports = { upload, UPLOAD_DIR };
