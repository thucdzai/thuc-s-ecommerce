const AppError = require('../utils/AppError');

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
    if (err instanceof AppError) {
        return res.status(err.statusCode).json({
            success: false,
            message: err.message,
            details: err.details,
        });
    }

    console.error('[Unhandled Error]', err);
    return res.status(500).json({
        success: false,
        message: 'Lỗi hệ thống, vui lòng thử lại sau',
    });
}

function notFoundHandler(req, res) {
    res.status(404).json({ success: false, message: `Route ${req.method} ${req.originalUrl} không tồn tại` });
}

module.exports = { errorHandler, notFoundHandler };
