const { Router } = require('express');
const cartRoutes = require('../modules/cart/cart.routes');

const router = Router();

router.get('/health', (req, res) => res.json({ success: true, message: 'cart-service is up' }));

router.use('/cart', cartRoutes);

module.exports = router;
