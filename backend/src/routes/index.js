const express = require('express');

const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const catalogRoutes = require('./catalog.routes');
const productsRoutes = require('./products.routes');
const categoryRoutes = require('./category.routes');
const specificationRoutes = require('./specification.routes');
const enquiryRoutes = require('./enquiry.routes');
const analyticsRoutes = require('./analytics.routes');
const supportRoutes = require('./support.routes');
const uploadRoutes = require('./upload.routes');
const publicRoutes = require('./public.routes');
const adminAuthRoutes = require('./adminAuth.routes');
const adminRoutes = require('./admin.routes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/catalogs', catalogRoutes);
router.use('/products', productsRoutes);
router.use('/categories', categoryRoutes);
router.use('/specifications', specificationRoutes);
router.use('/enquiries', enquiryRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/support-tickets', supportRoutes);
router.use('/upload', uploadRoutes);
router.use('/public', publicRoutes);
// Must be mounted before '/admin' below — admin.routes.js gates every
// route in it behind authenticateAdmin, and since '/admin' is a prefix
// of '/admin/auth/...' too, mounting order decides which one a request
// actually reaches first.
router.use('/admin/auth', adminAuthRoutes);
router.use('/admin', adminRoutes);

module.exports = router;
