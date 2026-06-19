const { Router } = require('express');
const paymentRoutes = require('../modules/payments/payment.routes');
const adminPaymentRoutes = require('../modules/payments/admin.routes');

const router = Router();

router.get('/health', (req, res) => res.json({ success: true, message: 'payment-service is up' }));

router.use('/payments', paymentRoutes);
router.use('/admin/payments', adminPaymentRoutes);

module.exports = router;
