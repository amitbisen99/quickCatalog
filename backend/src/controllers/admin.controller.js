const mongoose = require('mongoose');
const XLSX = require('xlsx');
const User = require('../models/User');
const Catalog = require('../models/Catalog');
const Product = require('../models/Product');
const Category = require('../models/Category');
const Specification = require('../models/Specification');
const Enquiry = require('../models/Enquiry');
const toSafeUser = require('../utils/toSafeUser');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const notImplemented = require('../utils/notImplemented');

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/** List-row shape — deliberately smaller than toSafeUser, this is a table row not a profile. */
function toUserSummary(user) {
  return {
    id: user._id,
    businessName: user.businessName,
    email: user.email,
    mobileNo: user.mobileNo,
    status: user.status,
    subscriptionType: user.subscriptionType,
    createdAt: user.createdAt,
  };
}

/** Same escape used by product.controller.js's buildSearchFilter — plain text, no regex injection. */
function escapeRegex(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
    user.mobileNo,
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
exports.getSupportTickets = notImplemented('GET /api/admin/support-tickets');
exports.updateTicketStatus = notImplemented('PUT /api/admin/support-tickets/:ticketId/status');
exports.replyToTicket = notImplemented('POST /api/admin/support-tickets/:ticketId/reply');
exports.getDashboardStats = notImplemented('GET /api/admin/dashboard/stats');
