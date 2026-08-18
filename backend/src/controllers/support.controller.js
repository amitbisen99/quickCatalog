const User = require('../models/User');
const SupportTicket = require('../models/SupportTicket');
const { sendSupportTicketNotificationEmail } = require('../services/email.service');
const asyncHandler = require('../utils/asyncHandler');
const toSupportTicketResponse = require('../utils/toSupportTicketResponse');

// Vendor-facing creation only — admin's list/status/reply on this same
// resource lives in admin.controller.js (admin.routes.js), same split
// pattern as the enquiry flow.
exports.createTicket = asyncHandler(async (req, res) => {
  const { reason, contactPersonName, contactMethod, contactValue } = req.body;
  const vendor = await User.findById(req.user.id);

  // Snapshot the vendor's current company name + registered email onto
  // the ticket itself — this is exactly what the admin panel needs to
  // show alongside the message, and it survives the vendor later
  // renaming their business or changing their account email.
  const ticket = await SupportTicket.create({
    vendorId: vendor._id,
    companyName: vendor.businessName || vendor.email,
    vendorEmail: vendor.email,
    reason,
    contactPersonName,
    contactMethod,
    contactValue,
  });

  // Best-effort — same pattern as the enquiry notification email: a
  // slow/failed send shouldn't fail the vendor's submission, which is
  // already saved and visible in the admin panel either way.
  if (process.env.ADMIN_EMAIL) {
    sendSupportTicketNotificationEmail(process.env.ADMIN_EMAIL, ticket).catch((err) =>
      console.error('Support ticket notification email failed:', err.message)
    );
  }

  res.status(201).json({
    success: true,
    message: "Your message has been sent to our support team — we'll get back to you soon.",
    ticket: toSupportTicketResponse(ticket),
  });
});
