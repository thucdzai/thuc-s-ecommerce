const AppError = require('../utils/AppError');

// Bọc Joi schema thành middleware: validate req.body/params/query trước khi chạm tới controller.
function validate(schema, property = 'body') {
    return (req, res, next) => {
        const { error, value } = schema.validate(req[property], { abortEarly: false, stripUnknown: true });

        if (error) {
            const details = error.details.map((d) => d.message);
            return next(new AppError(422, 'Dữ liệu đầu vào không hợp lệ', details));
        }

        req[property] = value;
        return next();
    };
}

module.exports = validate;
