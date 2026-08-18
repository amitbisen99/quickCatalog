const express = require('express');
const supportController = require('../controllers/support.controller');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createTicketValidators } = require('../validators/support.validators');

const router = express.Router();

router.use(authenticate, authorize('vendor'));

router.post('/', createTicketValidators, validate, supportController.createTicket);

// Note: admin-side list/status-update/reply for this same resource lives
// under /api/admin/support-tickets (admin.routes.js → admin.controller.js).

module.exports = router;
