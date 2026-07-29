const express = require('express');
const productController = require('../controllers/product.controller');
const { authenticate, authorize } = require('../middleware/auth');
const { productImagesUpload } = require('../middleware/upload');
const validate = require('../middleware/validate');
const { productValidators } = require('../validators/product.validators');

// mergeParams so :catalogId from the parent router (catalog.routes.js)
// is visible on req.params here. These routes are the *association*
// between a catalog and products — the product resource itself (global
// edit/delete) lives under /api/products (products.routes.js).
const router = express.Router({ mergeParams: true });

router.use(authenticate, authorize('vendor'));

router.get('/', productController.getProductsInCatalog);
router.post('/', productImagesUpload, productValidators, validate, productController.createProduct);
router.post('/:productId/link', productController.linkExistingProduct);
router.delete('/:productId', productController.unlinkProduct);

module.exports = router;
