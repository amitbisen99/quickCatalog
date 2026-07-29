const express = require('express');
const enquiryController = require('../controllers/enquiry.controller');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { updateEnquiryStatusValidators } = require('../validators/enquiry.validators');

const router = express.Router();

router.use(authenticate, authorize('vendor'));

router.get('/', enquiryController.getEnquiries);
router.get('/:enquiryId', enquiryController.getEnquiryById);
router.put('/:enquiryId/status', updateEnquiryStatusValidators, validate, enquiryController.updateEnquiryStatus);

// Note: POST /api/catalogs/:catalogId/enquiries (public submission) lives
// in catalog.routes.js, since it's nested under /catalogs.

module.exports = router;
