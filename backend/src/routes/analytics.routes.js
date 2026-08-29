const express = require('express');
const analyticsController = require('../controllers/analytics.controller');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Literal path registered ahead of '/:catalogId' below so it can never
// be shadowed by the params route.
router.get('/summary', authenticate, authorize('vendor'), analyticsController.getVendorAnalyticsSummary);

router.get('/:catalogId', authenticate, authorize('vendor'), analyticsController.getCatalogAnalytics);

// Public — fired from the public catalog page on every visit.
router.post('/track', analyticsController.trackVisit);

module.exports = router;
