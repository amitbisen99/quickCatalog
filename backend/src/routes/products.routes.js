const express = require('express');
const productController = require('../controllers/product.controller');
const { authenticate, authorize } = require('../middleware/auth');
const { productImagesUpload, bulkImportUpload } = require('../middleware/upload');
const validate = require('../middleware/validate');
const { productValidators, bulkPriceValidators, bulkCategoryValidators } = require('../validators/product.validators');

// The vendor's product library, independent of any one catalog.
const router = express.Router();

router.use(authenticate, authorize('vendor'));

// Literal paths registered ahead of '/:productId' below so they can
// never be shadowed by the params route.
router.get('/bulk-import-sample', productController.bulkImportSample);
router.post('/bulk-import', bulkImportUpload, productController.bulkImportProducts);
router.put('/bulk-price', bulkPriceValidators, validate, productController.bulkUpdatePrice);
router.put('/bulk-category', bulkCategoryValidators, validate, productController.bulkUpdateCategory);

router.get('/', productController.listVendorProducts);
router.post('/', productImagesUpload, productValidators, validate, productController.createStandaloneProduct);
router.get('/:productId', productController.getProduct);
router.put('/:productId', productImagesUpload, productValidators, validate, productController.updateProduct);
router.delete('/:productId', productController.deleteProduct);

module.exports = router;
