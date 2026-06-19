const { Router } = require('express');
const shipmentRoutes = require('../modules/shipments/shipment.routes');
const adminShipmentRoutes = require('../modules/shipments/admin.routes');

const router = Router();

router.get('/health', (req, res) => res.json({ success: true, message: 'shipping-service is up' }));

router.use('/shipping', shipmentRoutes);
router.use('/admin/shipments', adminShipmentRoutes);

module.exports = router;
