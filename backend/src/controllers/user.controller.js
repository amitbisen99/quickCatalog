const User = require('../models/User');
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
