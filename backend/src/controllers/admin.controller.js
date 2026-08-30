const mongoose = require('mongoose');
const XLSX = require('xlsx');
const User = require('../models/User');
const Catalog = require('../models/Catalog');
const Product = require('../models/Product');
const Category = require('../models/Category');
const Specification = require('../models/Specification');
const Enquiry = require('../models/Enquiry');
const SupportTicket = require('../models/SupportTicket');
const Payment = require('../models/Payment');
const toSafeUser = require('../utils/toSafeUser');
const toSupportTicketResponse = require('../utils/toSupportTicketResponse');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const notImplemented = require('../utils/notImplemented');
const { sendSupportTicketReplyEmail } = require('../services/email.service');
const { getPlanPricing } = require('../utils/planPricing');

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/** List-row shape — deliberately smaller than toSafeUser, this is a table row not a profile. */
function toUserSummary(user) {
  return {
    id: user._id,
    businessName: user.businessName,
    email: user.email,
    mobileNo: user.mobileNo,
    countryCode: user.countryCode,
    status: user.status,
    subscriptionType: user.subscriptionType,
    createdAt: user.createdAt,
  };
}

/** Same escape used by product.controller.js's buildSearchFilter — plain text, no regex injection. */
function escapeRegex(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Shared by the payments list and detail views — vendorId is always
    populated by the caller, so `vendor` is real vendor data, not just an id. */
function toPaymentResponse(payment) {
  const vendor = payment.vendorId && typeof payment.vendorId === 'object' ? payment.vendorId : null;
  return {
    id: payment._id,
    vendor: vendor
      ? {
          id: vendor._id,
          businessName: vendor.businessName,
          email: vendor.email,
          mobileNo: vendor.mobileNo,
          countryCode: vendor.countryCode,
          subscriptionType: vendor.subscriptionType,
          subscriptionExpiresAt: vendor.subscriptionExpiresAt,
        }
      : { id: payment.vendorId },
    razorpayOrderId: payment.razorpayOrderId,
    razorpayPaymentId: payment.razorpayPaymentId,
    razorpaySignature: payment.razorpaySignature,
    amount: payment.amount,
    currency: payment.currency,
    status: payment.status,
    createdAt: payment.createdAt,
    updatedAt: payment.updatedAt,
  };
}

function buildUserQuery(req) {
  const query = {};
  if (req.query.search) {
    const regex = new RegExp(escapeRegex(req.query.search), 'i');
    query.$or = [{ businessName: regex }, { email: regex }, { mobileNo: regex }];
  }
  if (req.query.plan === 'free' || req.query.plan === 'paid') {
    query.subscriptionType = req.query.plan;
  }
  return query;
}

exports.getUsers = asyncHandler(async (req, res) => {
  const query = buildUserQuery(req);
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || DEFAULT_LIMIT, 1), MAX_LIMIT);

  const [users, total] = await Promise.all([
    User.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    User.countDocuments(query),
  ]);

  res.json({
    success: true,
    users: users.map(toUserSummary),
    total,
    page,
    pages: Math.max(Math.ceil(total / limit), 1),
  });
});

exports.getUserById = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new AppError('Vendor not found', 404);
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new AppError('Vendor not found', 404);
  }

  res.json({ success: true, user: toSafeUser(user) });
});

exports.updateUserStatus = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { status } = req.body;
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new AppError('Vendor not found', 404);
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new AppError('Vendor not found', 404);
  }

  user.status = status;
  await user.save();

  res.json({ success: true, message: 'Vendor status updated', user: toSafeUser(user) });
});

exports.deleteUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new AppError('Vendor not found', 404);
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new AppError('Vendor not found', 404);
  }

  // Full account delete — unlike the vendor's own self-service catalog
  // delete (which preserves shared products/enquiries), this removes
  // everything so no orphaned data or still-live public catalog page is
  // left pointing at a vendor that no longer exists.
  await Promise.all([
    Catalog.deleteMany({ vendorId: user._id }),
    Product.deleteMany({ vendorId: user._id }),
    Category.deleteMany({ vendorId: user._id }),
    Specification.deleteMany({ vendorId: user._id }),
    Enquiry.deleteMany({ vendorId: user._id }),
  ]);
  await user.deleteOne();

  res.json({ success: true, message: 'Vendor deleted' });
});

exports.exportUsers = asyncHandler(async (req, res) => {
  const query = buildUserQuery(req);
  const users = await User.find(query).sort({ createdAt: -1 });

  const headers = ['Business Name', 'Email', 'Mobile', 'Status', 'Plan', 'Joined Date'];
  const rows = users.map((user) => [
    user.businessName || '',
    user.email,
    `${user.countryCode || ''} ${user.mobileNo}`.trim(),
    user.status,
    user.subscriptionType,
    user.createdAt ? user.createdAt.toISOString().slice(0, 10) : '',
  ]);

  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  XLSX.utils.book_append_sheet(workbook, sheet, 'Vendors');
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="vendors.xlsx"');
  res.send(buffer);
});

exports.getCatalogs = notImplemented('GET /api/admin/catalogs');

exports.getSupportTickets = asyncHandler(async (req, res) => {
  const query = {};
  if (['open', 'in_progress', 'closed'].includes(req.query.status)) {
    query.status = req.query.status;
  }
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || DEFAULT_LIMIT, 1), MAX_LIMIT);

  const [tickets, total] = await Promise.all([
    SupportTicket.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    SupportTicket.countDocuments(query),
  ]);

  res.json({
    success: true,
    tickets: tickets.map(toSupportTicketResponse),
    total,
    page,
    pages: Math.max(Math.ceil(total / limit), 1),
  });
});

exports.getSupportTicketById = asyncHandler(async (req, res) => {
  const { ticketId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(ticketId)) {
    throw new AppError('Support ticket not found', 404);
  }
  const ticket = await SupportTicket.findById(ticketId);
  if (!ticket) {
    throw new AppError('Support ticket not found', 404);
  }
  res.json({ success: true, ticket: toSupportTicketResponse(ticket) });
});

exports.updateTicketStatus = asyncHandler(async (req, res) => {
  const { ticketId } = req.params;
  const { status } = req.body;
  if (!mongoose.Types.ObjectId.isValid(ticketId)) {
    throw new AppError('Support ticket not found', 404);
  }
  const ticket = await SupportTicket.findById(ticketId);
  if (!ticket) {
    throw new AppError('Support ticket not found', 404);
  }

  ticket.status = status;
  await ticket.save();

  res.json({ success: true, message: 'Status updated', ticket: toSupportTicketResponse(ticket) });
});

exports.replyToTicket = asyncHandler(async (req, res) => {
  const { ticketId } = req.params;
  const { message } = req.body;
  if (!mongoose.Types.ObjectId.isValid(ticketId)) {
    throw new AppError('Support ticket not found', 404);
  }
  const ticket = await SupportTicket.findById(ticketId);
  if (!ticket) {
    throw new AppError('Support ticket not found', 404);
  }

  ticket.adminReply = message;
  ticket.repliedAt = new Date();
  // A reply means someone's actively handling it — only auto-advance out
  // of "open", never overwrite an admin's own "closed" via a follow-up reply.
  if (ticket.status === 'open') {
    ticket.status = 'in_progress';
  }
  await ticket.save();

  // Best-effort — the vendor has no in-app place to see this reply
  // (no "my tickets" view for this feature), so the email IS the reply
  // as far as they're concerned; still shouldn't fail the admin's action
  // if it doesn't send.
  sendSupportTicketReplyEmail(ticket.vendorEmail, ticket).catch((err) =>
    console.error('Support ticket reply email failed:', err.message)
  );

  res.json({ success: true, message: 'Reply sent', ticket: toSupportTicketResponse(ticket) });
});

exports.getDashboardStats = notImplemented('GET /api/admin/dashboard/stats');

function toPlanPricingResponse(pricing) {
  return { indiaPriceInr: pricing.indiaPriceInr, internationalPriceUsd: pricing.internationalPriceUsd };
}

exports.getPlanPricing = asyncHandler(async (req, res) => {
  const pricing = await getPlanPricing();
  res.json({ success: true, pricing: toPlanPricingResponse(pricing) });
});

exports.updatePlanPricing = asyncHandler(async (req, res) => {
  const { indiaPriceInr, internationalPriceUsd } = req.body;
  const pricing = await getPlanPricing();
  pricing.indiaPriceInr = indiaPriceInr;
  pricing.internationalPriceUsd = internationalPriceUsd;
  await pricing.save();
  res.json({ success: true, message: 'Plan pricing updated', pricing: toPlanPricingResponse(pricing) });
});

function toDomainRequestResponse(vendor) {
  return {
    vendorId: vendor._id,
    vendorBusinessName: vendor.businessName,
    vendorEmail: vendor.email,
    subdomain: vendor.subdomainStatus === 'pending' ? vendor.subdomain : undefined,
    customDomain: vendor.customDomainStatus === 'pending' ? vendor.customDomain : undefined,
    createdAt: vendor.updatedAt,
  };
}

// This host has no domain-provisioning API — every white-label
// subdomain/custom-domain request has to be set up by hand in hPanel
// (+ the vendor's own DNS, for custom domains). This is that manual
// queue: what's waiting on you, and the button that flips a request to
// 'active' once you've actually done the hPanel/DNS work and confirmed
// it resolves. Vendor-scoped (not per-catalog) — one white-label domain
// covers every catalog that vendor owns.
exports.getDomainRequests = asyncHandler(async (req, res) => {
  const vendors = await User.find({
    $or: [{ subdomainStatus: 'pending' }, { customDomainStatus: 'pending' }],
  }).sort({ updatedAt: 1 });

  res.json({ success: true, requests: vendors.map(toDomainRequestResponse) });
});

exports.updateDomainRequest = asyncHandler(async (req, res) => {
  const { vendorId } = req.params;
  const { type, status } = req.body;
  if (!mongoose.Types.ObjectId.isValid(vendorId)) {
    throw new AppError('Vendor not found', 404);
  }

  const vendor = await User.findById(vendorId);
  if (!vendor) {
    throw new AppError('Vendor not found', 404);
  }

  if (type === 'subdomain') {
    if (!vendor.subdomain) {
      throw new AppError('This vendor has no subdomain request', 400);
    }
    vendor.subdomainStatus = status;
  } else {
    if (!vendor.customDomain) {
      throw new AppError('This vendor has no custom domain request', 400);
    }
    vendor.customDomainStatus = status;
  }
  await vendor.save();

  res.json({ success: true, message: 'Domain request updated' });
});

// One row per Razorpay order a vendor started — 'created' (never
// completed, could be abandoned or still in progress), 'paid'
// (verified success), or 'failed' (signature verification failed).
// These are the only statuses this integration can produce today: it's
// a client-driven checkout + signature-verify flow, not Razorpay
// webhooks, so gateway-side states like refunded/disputed aren't
// captured — adding those would mean a separate webhook endpoint.
exports.getPayments = asyncHandler(async (req, res) => {
  const query = {};
  if (['created', 'paid', 'failed'].includes(req.query.status)) {
    query.status = req.query.status;
  }

  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || DEFAULT_LIMIT, 1), MAX_LIMIT);

  const [payments, total] = await Promise.all([
    Payment.find(query)
      .populate('vendorId', 'businessName email mobileNo countryCode subscriptionType subscriptionExpiresAt')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Payment.countDocuments(query),
  ]);

  res.json({
    success: true,
    payments: payments.map(toPaymentResponse),
    total,
    page,
    pages: Math.max(Math.ceil(total / limit), 1),
  });
});

exports.getPaymentById = asyncHandler(async (req, res) => {
  const { paymentId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(paymentId)) {
    throw new AppError('Payment not found', 404);
  }
  const payment = await Payment.findById(paymentId).populate(
    'vendorId',
    'businessName email mobileNo countryCode subscriptionType subscriptionExpiresAt currency'
  );
  if (!payment) {
    throw new AppError('Payment not found', 404);
  }
  res.json({ success: true, payment: toPaymentResponse(payment) });
});
