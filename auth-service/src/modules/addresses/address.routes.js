const { Router } = require('express');
const { authenticate } = require('../../middlewares/authenticate');
const validate = require('../../middlewares/validate');
const schema = require('./address.validation');
const controller = require('./address.controller');

// mergeParams: nhận :userId từ router cha (mounted dưới /api/users/:userId/addresses)
const router = Router({ mergeParams: true });

router.use(authenticate);

router.get('/', validate(schema.userIdParam, 'params'), controller.list);
router.post('/', validate(schema.userIdParam, 'params'), validate(schema.upsertAddress), controller.create);
router.put('/:addressId', validate(schema.addressIdParams, 'params'), validate(schema.upsertAddress), controller.update);
router.delete('/:addressId', validate(schema.addressIdParams, 'params'), controller.remove);
router.patch('/:addressId/default', validate(schema.addressIdParams, 'params'), controller.setDefault);

module.exports = router;
