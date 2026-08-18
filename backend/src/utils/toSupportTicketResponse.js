// Shared response shape — used by both support.controller.js (vendor
// creates their own ticket) and admin.controller.js (admin lists/reads/
// updates every vendor's tickets), same split as toSafeUser.js.
function toSupportTicketResponse(ticket) {
  return {
    id: ticket._id,
    companyName: ticket.companyName,
    vendorEmail: ticket.vendorEmail,
    reason: ticket.reason,
    contactPersonName: ticket.contactPersonName,
    contactMethod: ticket.contactMethod,
    contactValue: ticket.contactValue,
    status: ticket.status,
    adminReply: ticket.adminReply,
    repliedAt: ticket.repliedAt,
    createdAt: ticket.createdAt,
  };
}

module.exports = toSupportTicketResponse;
