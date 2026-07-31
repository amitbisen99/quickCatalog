const express = require('express');
const adminController = require('../controllers/admin.controller');
const { authenticateAdmin, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateAdmin, authorize('admin'));

router.get('/users', adminController.getUsers);
router.put('/users/:userId/status', adminController.updateUserStatus);
router.delete('/users/:userId', adminController.deleteUser);
router.get('/catalogs', adminController.getCatalogs);
router.get('/support-tickets', adminController.getSupportTickets);
router.put('/support-tickets/:ticketId/status', adminController.updateTicketStatus);
router.post('/support-tickets/:ticketId/reply', adminController.replyToTicket);
router.get('/dashboard/stats', adminController.getDashboardStats);

module.exports = router;
