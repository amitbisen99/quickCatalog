const jwt = require('jsonwebtoken');
const User = require('../models/User');
const generateOtp = require('../utils/generateOtp');
const { sendOtpEmail, sendPasswordResetEmail, sendWelcomeEmail } = require('../services/email.service');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const toSafeUser = require('../utils/toSafeUser');
const {
  generateAccessToken,
  accessCookieOptions,
  setAuthCookies,
  clearAuthCookies,
} = require('../utils/token');

const OTP_TTL_MINUTES = 10;
const RESET_TOKEN_TTL_HOURS = 1;
const GENERIC_RESET_MESSAGE = 'If an account exists for this email, a password reset link has been sent.';

exports.signup = asyncHandler(async (req, res) => {
  const { email, mobileNo, countryCode, password } = req.body;

  let user = await User.findOne({ email });

  if (user && user.status === 'verified') {
    throw new AppError('An account with this email already exists', 409);
  }

  const otp = generateOtp();

  if (user) {
    // Unverified user retrying signup (e.g. lost the first OTP) — refresh
    // their details instead of leaving them stuck.
    user.mobileNo = mobileNo;
    user.countryCode = countryCode;
    user.password = password;
    await user.setOtp(otp, OTP_TTL_MINUTES);
    await user.save();
  } else {
    user = new User({ email, mobileNo, countryCode, password });
    await user.setOtp(otp, OTP_TTL_MINUTES);
    await user.save();
  }

  const emailResult = await sendOtpEmail(email, otp);

  res.status(201).json({
    success: true,
    message: 'Verification email sent to your email address',
    // Only present when Brevo isn't configured — lets local dev/testing
    // proceed without a real inbox. Never sent once BREVO_API_KEY is set.
    ...(emailResult.sent ? {} : { devOtp: otp }),
  });
});

exports.verifyEmail = asyncHandler(async (req, res) => {
  const { email, otp, businessName, businessType, industry } = req.body;

  const user = await User.findOne({ email }).select('+otpHash +otpExpiresAt');
  if (!user) {
    throw new AppError('No pending signup found for this email', 404);
  }
  if (user.status === 'verified') {
    throw new AppError('This account is already verified', 409);
  }

  const otpValid = await user.compareOtp(otp);
  if (!otpValid) {
    throw new AppError('Invalid or expired verification code', 400);
  }

  user.status = 'verified';
  user.businessName = businessName;
  user.businessType = businessType;
  user.industry = industry;
  user.otpHash = undefined;
  user.otpExpiresAt = undefined;
  await user.save();

  // Log the vendor straight in — verification is the last step of
  // registration, so there's no reason to make them re-enter their
  // password on a separate login screen right after. Same cookies login()
  // sets, just issued here instead.
  setAuthCookies(res, user, false);

  // Best-effort — registration is already complete and the vendor is
  // already logged in at this point, so a Brevo hiccup here shouldn't
  // turn into a 500 on an otherwise-successful verification.
  try {
    await sendWelcomeEmail(user.email, user.businessName);
  } catch (err) {
    console.error('Failed to send welcome email:', err);
  }

  res.json({ success: true, message: 'Account verified successfully', user: toSafeUser(user) });
});

exports.resendVerification = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    throw new AppError('No pending signup found for this email', 404);
  }
  if (user.status === 'verified') {
    throw new AppError('This account is already verified', 409);
  }

  const otp = generateOtp();
  await user.setOtp(otp, OTP_TTL_MINUTES);
  await user.save();

  const emailResult = await sendOtpEmail(email, otp);

  res.json({
    success: true,
    message: 'Verification code resent to your email address',
    ...(emailResult.sent ? {} : { devOtp: otp }),
  });
});

exports.login = asyncHandler(async (req, res) => {
  const { email, password, rememberMe } = req.body;

  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    throw new AppError('Invalid email or password', 401);
  }

  if (user.status === 'unverified') {
    throw new AppError('Please verify your email before logging in', 403);
  }
  if (user.status === 'inactive') {
    throw new AppError('Your account has been deactivated. Contact support.', 403);
  }

  setAuthCookies(res, user, rememberMe === true || rememberMe === 'true');

  res.json({ success: true, message: 'Logged in successfully', user: toSafeUser(user) });
});

exports.refreshToken = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (!token) {
    throw new AppError('No active session', 401);
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch (err) {
    throw new AppError('Session expired. Please log in again.', 401);
  }

  const user = await User.findById(payload.id);
  if (!user || user.status !== 'verified') {
    throw new AppError('Session expired. Please log in again.', 401);
  }

  res.cookie('accessToken', generateAccessToken(user), accessCookieOptions());
  res.json({ success: true, message: 'Session refreshed' });
});

exports.logout = asyncHandler(async (req, res) => {
  clearAuthCookies(res);
  res.json({ success: true, message: 'Logged out successfully' });
});

exports.forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    // Same response whether or not the account exists — avoids leaking
    // which emails are registered.
    return res.json({ success: true, message: GENERIC_RESET_MESSAGE });
  }

  const resetToken = jwt.sign({ id: user._id.toString(), purpose: 'password-reset' }, process.env.JWT_SECRET, {
    expiresIn: `${RESET_TOKEN_TTL_HOURS}h`,
  });
  await user.setResetToken(resetToken, RESET_TOKEN_TTL_HOURS);
  await user.save();

  const resetLink = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;
  const emailResult = await sendPasswordResetEmail(email, resetLink);

  res.json({
    success: true,
    message: GENERIC_RESET_MESSAGE,
    // Only present when Brevo isn't configured — same local-dev
    // convenience as the signup OTP fallback.
    ...(emailResult.sent ? {} : { devResetLink: resetLink }),
  });
});

exports.resetPassword = asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;
  const genericError = () => new AppError('Invalid or expired reset link. Please request a new one.', 400);

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    throw genericError();
  }
  if (payload.purpose !== 'password-reset') {
    throw genericError();
  }

  const user = await User.findById(payload.id).select('+resetPasswordTokenHash +resetPasswordExpiresAt');
  if (!user) {
    throw genericError();
  }

  const tokenValid = await user.compareResetToken(token);
  if (!tokenValid) {
    throw genericError();
  }

  user.password = newPassword;
  user.resetPasswordTokenHash = undefined;
  user.resetPasswordExpiresAt = undefined;
  await user.save();

  res.json({ success: true, message: 'Password reset successfully. You can now log in.' });
});
