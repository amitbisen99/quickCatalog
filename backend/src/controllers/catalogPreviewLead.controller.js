const CatalogPreviewLead = require('../models/CatalogPreviewLead');
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
