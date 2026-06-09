// Bọc các route handler async để tự động đẩy lỗi vào errorHandler thay vì try/catch lặp lại ở mỗi controller.
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
