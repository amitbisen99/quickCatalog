const express = require('express');
const publicController = require('../controllers/public.controller');
const catalogPreviewLeadController = require('../controllers/catalogPreviewLead.controller');
const { excelUpload } = require('../middleware/upload');
const { authLimiter } = require('../middleware/rateLimiter');
const validate = require('../middleware/validate');
const { catalogPreviewLeadValidators } = require('../validators/catalogPreviewLead.validators');

// No auth anywhere in this router — these are hit directly by anonymous
// site visitors browsing a vendor's catalog.
const router = express.Router();

router.get('/resolve-domain', publicController.resolveDomain);
router.get('/plan-price', publicController.getPublicPlanPrice);
router.get('/sitemap-catalogs', publicController.getSitemapCatalogs);
router.get('/catalog/:catalogSlug', publicController.getCatalogBySlug);
router.get('/catalog/:catalogSlug/og-image', publicController.getCatalogOgImage);
router.get('/catalog/:catalogSlug/products/:productSlug', publicController.getCatalogProductBySlug);
router.get('/catalog/:catalogSlug/products/:productSlug/og-image', publicController.getProductOgImage);

// Tighter authLimiter (not the global limiter) — unauthenticated, file
// upload, an obvious spam/abuse target.
router.post(
  '/catalog-preview-leads',
  authLimiter,
  excelUpload,
  catalogPreviewLeadValidators,
  validate,
  catalogPreviewLeadController.submitCatalogPreviewLead
);

module.exports = router;
