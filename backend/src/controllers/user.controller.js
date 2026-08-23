const mongoose = require('mongoose');
const User = require('../models/User');
const Catalog = require('../models/Catalog');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const toSafeUser = require('../utils/toSafeUser');
const notImplemented = require('../utils/notImplemented');
const { compressImageToDataUrl } = require('../utils/imageProcessor');

exports.getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) {
    throw new AppError('User not found', 404);
  }
  res.json({ success: true, user: toSafeUser(user) });
});

exports.updateProfile = asyncHandler(async (req, res) => {
  const { mobileNo, businessName, businessType, industry, currency } = req.body;

  const user = await User.findById(req.user.id);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  user.mobileNo = mobileNo;
  user.businessName = businessName;
  user.businessType = businessType;
  user.industry = industry;
  if (currency) user.currency = currency;

  // Interim storage: compressed inline as a data URL, same as product
  // images, until real cloud storage (DigitalOcean Spaces) lands.
  const logoFile = req.files?.logo?.[0];
  if (logoFile) {
    user.logo = await compressImageToDataUrl(logoFile.buffer);
  }
  const bannerFile = req.files?.banner?.[0];
  if (bannerFile) {
    user.banner = await compressImageToDataUrl(bannerFile.buffer);
  }

  await user.save();

  res.json({ success: true, message: 'Profile updated successfully', user: toSafeUser(user) });
});

exports.changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user.id).select('+password');
  if (!user || !(await user.comparePassword(currentPassword))) {
    throw new AppError('Current password is incorrect', 401);
  }

  user.password = newPassword;
  await user.save();

  res.json({ success: true, message: 'Password changed successfully' });
});

exports.deleteAccount = notImplemented('DELETE /api/users/account');

// The old "trust upgrade" endpoint that lived here (just flipped
// subscriptionType to 'paid' with no payment, since there was no gateway
// wired up yet) has been replaced by the real Razorpay flow in
// payment.controller.js / payment.routes.js — leaving an
// unauthenticated-by-payment "become paid" endpoint reachable here would
// be a free-upgrade exploit now that real payments exist.

// White-label domains — vendor-scoped, not per-catalog: once one of these
// is active, every catalog the vendor owns is reachable at
// `{domain}/public/{slug}` for free, since the public catalog route
// already resolves purely by slug regardless of hostname (see
// public.controller.js's resolveDomain for the root-path/primary-catalog
// resolution middleware.ts actually needs). This host has no
// domain-provisioning API, so setting either field only records the
// request as 'pending' — an admin still has to do the hPanel + DNS work
// by hand, then flip it to 'active' via the admin domain-requests screen.

exports.setSubdomain = asyncHandler(async (req, res) => {
  const { subdomain } = req.body;

  const existing = await User.findOne({ subdomain, _id: { $ne: req.user.id } });
  if (existing) {
    throw new AppError('That subdomain is already taken', 409);
  }

  const user = await User.findByIdAndUpdate(
    req.user.id,
    { subdomain, subdomainStatus: 'pending' },
    { new: true }
  );
  res.json({ success: true, message: 'Subdomain requested — we’ll set this up shortly', user: toSafeUser(user) });
});

exports.removeSubdomain = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.user.id,
    { $unset: { subdomain: '', subdomainStatus: '' } },
    { new: true }
  );
  res.json({ success: true, message: 'Subdomain removed', user: toSafeUser(user) });
});

exports.setCustomDomain = asyncHandler(async (req, res) => {
  const { customDomain } = req.body;

  const user = await User.findById(req.user.id);
  if (user.subscriptionType !== 'paid') {
    throw new AppError('Custom domains are a paid-plan feature. Upgrade to connect your own domain.', 403);
  }

  const existing = await User.findOne({ customDomain, _id: { $ne: user._id } });
  if (existing) {
    throw new AppError('That domain is already connected to another account', 409);
  }

  user.customDomain = customDomain;
  user.customDomainStatus = 'pending';
  await user.save();

  res.json({ success: true, message: 'Domain requested — we’ll set this up shortly', user: toSafeUser(user) });
});

exports.removeCustomDomain = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.user.id,
    { $unset: { customDomain: '', customDomainStatus: '' } },
    { new: true }
  );
  res.json({ success: true, message: 'Domain removed', user: toSafeUser(user) });
});

// Which catalog a vendor's white-label domain root redirects to — only
// meaningful once they have more than one catalog (paid plan), but
// available regardless in case they want to set it ahead of time.
exports.setPrimaryCatalog = asyncHandler(async (req, res) => {
  const { catalogId } = req.body;
  if (!mongoose.Types.ObjectId.isValid(catalogId)) {
    throw new AppError('Catalog not found', 404);
  }

  const catalog = await Catalog.findOne({ _id: catalogId, vendorId: req.user.id });
  if (!catalog) {
    throw new AppError('Catalog not found', 404);
  }

  const user = await User.findByIdAndUpdate(req.user.id, { primaryCatalogId: catalog._id }, { new: true });
  res.json({ success: true, message: 'Primary catalog updated', user: toSafeUser(user) });
});
