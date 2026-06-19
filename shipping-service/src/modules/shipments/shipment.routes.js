const { Router } = require('express');
const { authenticate } = require('../../middlewares/authenticate');
const validate = require('../../middlewares/validate');
const schema = require('./shipment.validation');
const controller = require('./shipment.controller');

const router = Router();

router.post('/calculate-fee', authenticate, validate(schema.calculateFeeBody), controller.calculateFee);

router.get('/me', authenticate, validate(schema.myShipmentsQuery, 'query'), controller.listMyShipments);
router.get('/me/:orderCode', authenticate, validate(schema.orderCodeParam, 'params'), controller.getMyShipmentDetail);

module.exports = router;
