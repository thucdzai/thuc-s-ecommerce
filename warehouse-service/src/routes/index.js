const { Router } = require('express');
const inventoryRoutes = require('../modules/inventory/inventory.routes');
const adminInventoryRoutes = require('../modules/inventory/admin.routes');

const router = Router();

router.get('/health', (req, res) => res.json({ success: true, message: 'warehouse-service is up' }));

router.use('/inventory', inventoryRoutes);
router.use('/admin/inventory', adminInventoryRoutes);

module.exports = router;
