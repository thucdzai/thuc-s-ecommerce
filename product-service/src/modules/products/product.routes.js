const { Router } = require('express');
const validate = require('../../middlewares/validate');
const schema = require('./product.validation');
const controller = require('./product.controller');

const router = Router();

router.get('/', validate(schema.listQuery, 'query'), controller.list);
router.get('/:id', validate(schema.idParam, 'params'), controller.getDetail);

module.exports = router;
