const express = require('express');
const catalogController = require('../controllers/catalog.controller');
const enquiryController = require('../controllers/enquiry.controller');
const productRoutes = require('./product.routes');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { excelUpload } = require('../middleware/upload');
const { createCatalogValidators, updateCatalogValidators } = require('../validators/catalog.validators');
const { createEnquiryValidators } = require('../validators/enquiry.validators');

const router = express.Router();

// Literal path registered ahead of the '/:catalogId' params below so it
// can never be shadowed.
router.post(
  '/create-from-file',
  authenticate,
  authorize('vendor'),
  excelUpload,
  catalogController.createFromFile
);

router.get('/', authenticate, authorize('vendor'), catalogController.getCatalogs);
router.post('/', authenticate, authorize('vendor'), createCatalogValidators, validate, catalogController.createCatalog);
router.get('/:catalogId', authenticate, authorize('vendor'), catalogController.getCatalogById);
router.put(
  '/:catalogId',
  authenticate,
  authorize('vendor'),
  updateCatalogValidators,
  validate,
  catalogController.updateCatalog
);
router.delete('/:catalogId', authenticate, authorize('vendor'), catalogController.deleteCatalog);
router.get('/:catalogId/stats', authenticate, authorize('vendor'), catalogController.getCatalogStats);
router.get('/:catalogId/pdf', authenticate, authorize('vendor'), catalogController.downloadCatalogPdf);

// Public — a site visitor submits this from the catalog page's enquiry
// cart, no vendor auth involved.
router.post('/:catalogId/enquiries', createEnquiryValidators, validate, enquiryController.createEnquiryForCatalog);

router.use('/:catalogId/products', productRoutes);

module.exports = router;
