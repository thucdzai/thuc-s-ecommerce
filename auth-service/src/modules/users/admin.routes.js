const { Router } = require('express');
const { authenticate, authorize } = require('../../middlewares/authenticate');
const controller = require('./admin.controller');

const router = Router();

router.use(authenticate, authorize('ADMIN'));

router.get('/', controller.list);
router.patch('/:id/ban', controller.banUser);
router.patch('/:id/unban', controller.unbanUser);

module.exports = router;
