const { Router } = require('express');
const categoryRoutes = require('../modules/categories/category.routes');
const productRoutes = require('../modules/products/product.routes');
const adminProductRoutes = require('../modules/products/admin.routes');
const uploadRoutes = require('../modules/uploads/upload.routes');

const router = Router();

router.get('/health', (req, res) => res.json({ success: true, message: 'product-service is up' }));

router.use('/categories', categoryRoutes);
router.use('/products', productRoutes);
router.use('/admin/products', adminProductRoutes);
router.use('/uploads', uploadRoutes);

module.exports = router;
