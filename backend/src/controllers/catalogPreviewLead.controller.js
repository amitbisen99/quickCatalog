const CatalogPreviewLead = require('../models/CatalogPreviewLead');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const {
  sendCatalogPreviewLeadNotificationEmail,
  sendCatalogPreviewLeadConfirmationEmail,
} = require('../services/email.service');

// No auth — submitted by an anonymous visitor from the public
// "Free Catalog Preview" landing page (frontend/pages/catalog-preview.tsx).
exports.submitCatalogPreviewLead = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new AppError('Please attach your product Excel or price list', 400);
  }

  const { fullName, email, whatsappNo, industry, numberOfProducts } = req.body;

  const lead = await CatalogPreviewLead.create({
    fullName,
    email,
    whatsappNo,
    industry,
    numberOfProducts,
    excelFileName: req.file.originalname,
    excelFileData: `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`,
  });

  // Best-effort — a Brevo hiccup shouldn't fail the submission itself;
  // the lead is already saved and visible in the admin panel either way.
  try {
    await Promise.all([
      sendCatalogPreviewLeadNotificationEmail(lead),
      sendCatalogPreviewLeadConfirmationEmail(lead),
    ]);
  } catch (err) {
    console.error('Catalog preview lead notification email failed:', err.message);
  }

  res.status(201).json({ success: true });
});

// Authenticated — the "Don't Have Time to Build It? We'll Do It For You"
// card on a logged-in vendor's dashboard (SetupHelpCard.tsx). The vendor
// already has an account, so this only needs their Excel file; every
// other field is snapshotted from their profile instead of asked again —
// same pattern as support.controller.js's createTicket.
exports.submitSetupHelpRequest = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new AppError('Please attach your product Excel or price list', 400);
  }

  const vendor = await User.findById(req.user.id);
  if (!vendor) {
    throw new AppError('User not found', 404);
  }
  // The card itself is hidden for Paid-plan vendors (they can already
  // publish on their own) — this mirrors that server-side rather than
  // relying on the UI alone to enforce it.
  if (vendor.subscriptionType === 'paid') {
    throw new AppError('Free setup help is only available on the Free plan.', 403);
  }

  const lead = await CatalogPreviewLead.create({
    source: 'vendor_dashboard',
    vendorId: vendor._id,
    fullName: vendor.businessName || vendor.email,
    email: vendor.email,
    whatsappNo: `${vendor.countryCode || ''}${vendor.mobileNo}`,
    industry: vendor.industry || undefined,
    excelFileName: req.file.originalname,
    excelFileData: `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`,
  });

  try {
    await Promise.all([
      sendCatalogPreviewLeadNotificationEmail(lead),
      sendCatalogPreviewLeadConfirmationEmail(lead),
    ]);
  } catch (err) {
    console.error('Vendor setup-help lead notification email failed:', err.message);
  }

  res.status(201).json({ success: true });
});
