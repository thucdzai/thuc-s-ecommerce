const { Router } = require('express');
const validate = require('../../middlewares/validate');
const schema = require('./auth.validation');
const controller = require('./auth.controller');

const router = Router();

router.post('/register', validate(schema.register), controller.register);
router.post('/login', validate(schema.login), controller.login);
router.post('/refresh-token', validate(schema.refreshToken), controller.refreshToken);
router.post('/logout', validate(schema.refreshToken), controller.logout);
router.post('/forgot-password', validate(schema.forgotPassword), controller.forgotPassword);
router.post('/reset-password', validate(schema.resetPassword), controller.resetPassword);

module.exports = router;
