const { Router } = require('express');
const authRoutes = require('../modules/auth/auth.routes');
const userRoutes = require('../modules/users/user.routes');
const adminUserRoutes = require('../modules/users/admin.routes');

const router = Router();

router.get('/health', (_req, res) => res.json({ success: true, message: 'auth-service is up' }));

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/admin/users', adminUserRoutes);

module.exports = router;
