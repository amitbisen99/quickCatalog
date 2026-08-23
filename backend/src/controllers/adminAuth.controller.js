const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { setAdminAuthCookies, clearAdminAuthCookies, generateAdminAccessToken, adminAccessCookieOptions } = require('../utils/token');

// Single super-admin credential from env (ADMIN_EMAIL/ADMIN_PASSWORD_HASH) —
// no Admin model/collection, matching docs/ARCHITECTURE.md's decision that
// this is one operator, not a team.
//
// ADMIN_PASSWORD_HASH is stored base64-encoded, not as the raw bcrypt
// hash — confirmed via diagnostic logging that Hostinger's hPanel env-var
// storage mangles '$' characters (escapes each one as '\$'), which
// silently corrupts a raw bcrypt hash (it's delimited by exactly three
// '$' characters) so it can never match again. Base64 output contains no
// '$' or other shell-special characters, so it survives untouched
// regardless of the host's env-var pipeline. See backend/.env.example for
// the exact command to generate this value.
function getAdminPasswordHash() {
  if (!process.env.ADMIN_PASSWORD_HASH) return null;
  return Buffer.from(process.env.ADMIN_PASSWORD_HASH, 'base64').toString('utf8');
}

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const adminPasswordHash = getAdminPasswordHash();
  const emailMatches = process.env.ADMIN_EMAIL && email.toLowerCase() === process.env.ADMIN_EMAIL.toLowerCase();
  const passwordMatches = adminPasswordHash && (await bcrypt.compare(password, adminPasswordHash));

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
