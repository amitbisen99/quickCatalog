const notImplemented = require('../utils/notImplemented');

exports.getUsers = notImplemented('GET /api/admin/users');
exports.updateUserStatus = notImplemented('PUT /api/admin/users/:userId/status');
exports.deleteUser = notImplemented('DELETE /api/admin/users/:userId');
exports.getCatalogs = notImplemented('GET /api/admin/catalogs');
exports.getSupportTickets = notImplemented('GET /api/admin/support-tickets');
exports.updateTicketStatus = notImplemented('PUT /api/admin/support-tickets/:ticketId/status');
exports.replyToTicket = notImplemented('POST /api/admin/support-tickets/:ticketId/reply');
exports.getDashboardStats = notImplemented('GET /api/admin/dashboard/stats');
