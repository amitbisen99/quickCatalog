const express = require('express');
const adminController = require('../controllers/admin.controller');
const { authenticateAdmin, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  updateUserStatusValidators,
  updateTicketStatusValidators,
  replyToTicketValidators,
} = require('../validators/admin.validators');

const router = express.Router();

router.use(authenticateAdmin, authorize('admin'));

router.get('/users', adminController.getUsers);
// Must come before '/users/:userId' — otherwise Express would match the
// literal "export" as a :userId value.
router.get('/users/export', adminController.exportUsers);
router.get('/users/:userId', adminController.getUserById);
router.put('/users/:userId/status', updateUserStatusValidators, validate, adminController.updateUserStatus);
router.delete('/users/:userId', adminController.deleteUser);
router.get('/catalogs', adminController.getCatalogs);
router.get('/support-tickets', adminController.getSupportTickets);
router.get('/support-tickets/:ticketId', adminController.getSupportTicketById);
router.put(
  '/support-tickets/:ticketId/status',
  updateTicketStatusValidators,
  validate,
  adminController.updateTicketStatus
);
router.post('/support-tickets/:ticketId/reply', replyToTicketValidators, validate, adminController.replyToTicket);
router.get('/dashboard/stats', adminController.getDashboardStats);

module.exports = router;
