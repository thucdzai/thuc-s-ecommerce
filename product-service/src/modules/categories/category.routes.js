const { Router } = require('express');
const controller = require('./category.controller');

const router = Router();

router.get('/', controller.getTree);

module.exports = router;
