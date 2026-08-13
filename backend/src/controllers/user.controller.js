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

// Records a plan choice — there's no payment gateway wired up yet, so this
// is a direct, honest "trust upgrade" rather than a real billing charge.
// Kept as its own endpoint (not folded into updateProfile) so swapping in
// real billing later doesn't have to touch unrelated profile-edit code.
exports.upgradePlan = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  user.subscriptionType = 'paid';
  await user.save();

  res.json({ success: true, message: 'Plan upgraded successfully', user: toSafeUser(user) });
});
