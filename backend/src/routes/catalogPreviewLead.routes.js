const express = require('express');
const catalogPreviewLeadController = require('../controllers/catalogPreviewLead.controller');
const { authenticate, authorize } = require('../middleware/auth');
const { excelUpload } = require('../middleware/upload');

const router = express.Router();

router.use(authenticate, authorize('vendor'));

// Vendor-dashboard counterpart to POST /public/catalog-preview-leads
// (public.routes.js) — same underlying model, tagged source:
// 'vendor_dashboard'. No body validators here: unlike the public form,
// this only ever takes the Excel file, everything else comes from the
// authenticated vendor's own profile (see submitSetupHelpRequest).
router.post('/', excelUpload, catalogPreviewLeadController.submitSetupHelpRequest);

// Note: admin-side list/status-update for this same resource lives under
// /api/admin/catalog-preview-leads (admin.routes.js → admin.controller.js).

module.exports = router;
