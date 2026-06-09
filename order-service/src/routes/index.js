const { Router } = require('express');
const orderRoutes = require('../modules/orders/order.routes');
const adminOrderRoutes = require('../modules/orders/admin.routes');
const promotionRoutes = require('../modules/promotions/promotion.routes');
const adminPromotionRoutes = require('../modules/promotions/admin.routes');

const router = Router();

router.get('/health', (req, res) => res.json({ success: true, message: 'order-service is up' }));

router.use('/orders', orderRoutes);
router.use('/admin/orders', adminOrderRoutes);
router.use('/promotions', promotionRoutes);
router.use('/admin/promotions', adminPromotionRoutes);

module.exports = router;
