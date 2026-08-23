const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { setAdminAuthCookies, clearAdminAuthCookies, generateAdminAccessToken, adminAccessCookieOptions } = require('../utils/token');

// Single super-admin credential from env (ADMIN_EMAIL/ADMIN_PASSWORD_HASH) —
// no Admin model/collection, matching docs/ARCHITECTURE.md's decision that
// this is one operator, not a team.
exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const emailMatches = process.env.ADMIN_EMAIL && email.toLowerCase() === process.env.ADMIN_EMAIL.toLowerCase();
  const passwordMatches = process.env.ADMIN_PASSWORD_HASH && (await bcrypt.compare(password, process.env.ADMIN_PASSWORD_HASH));

  // TEMP DIAGNOSTIC — tracking down a hPanel env-var mismatch. Logs only
  // shapes/lengths/booleans, never the actual email, password, or hash
  // values. Remove once the mismatch is found.
  // eslint-disable-next-line no-console
  console.log('[admin-login-debug]', {
    envEmailSet: !!process.env.ADMIN_EMAIL,
    envEmailLength: process.env.ADMIN_EMAIL ? process.env.ADMIN_EMAIL.length : null,
    envHashSet: !!process.env.ADMIN_PASSWORD_HASH,
    envHashLength: process.env.ADMIN_PASSWORD_HASH ? process.env.ADMIN_PASSWORD_HASH.length : null,
    envHashPrefix: process.env.ADMIN_PASSWORD_HASH ? process.env.ADMIN_PASSWORD_HASH.slice(0, 4) : null,
    submittedEmailLength: email ? email.length : null,
    submittedPasswordLength: password ? password.length : null,
    emailMatches,
    passwordMatches,
  });

  if (!emailMatches || !passwordMatches) {
    throw new AppError('Invalid email or password', 401);
  }

  setAdminAuthCookies(res);
  res.json({ success: true, message: 'Logged in successfully', admin: { email: process.env.ADMIN_EMAIL } });
});

exports.logout = asyncHandler(async (req, res) => {
  clearAdminAuthCookies(res);
  res.json({ success: true, message: 'Logged out successfully' });
});

exports.me = asyncHandler(async (req, res) => {
  res.json({ success: true, admin: { email: process.env.ADMIN_EMAIL } });
});

exports.refreshToken = asyncHandler(async (req, res) => {
  const token = req.cookies?.adminRefreshToken;
  if (!token) {
    throw new AppError('No active session', 401);
  }

  try {
    jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch (err) {
    throw new AppError('Session expired. Please log in again.', 401);
  }

  res.cookie('adminAccessToken', generateAdminAccessToken(), adminAccessCookieOptions());
  res.json({ success: true, message: 'Session refreshed' });
});
