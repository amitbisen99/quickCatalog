const express = require('express');
const publicController = require('../controllers/public.controller');

// No auth anywhere in this router — these are hit directly by anonymous
// site visitors browsing a vendor's catalog.
const router = express.Router();

router.get('/catalog/:catalogSlug', publicController.getCatalogBySlug);
router.get('/catalog/:catalogSlug/og-image', publicController.getCatalogOgImage);
router.get('/catalog/:catalogSlug/products/:productId', publicController.getCatalogProductBySlug);

module.exports = router;
