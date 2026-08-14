const jwt = require('jsonwebtoken');

const DAY_MS = 24 * 60 * 60 * 1000;

function generateAccessToken(user) {
  return jwt.sign({ id: user._id.toString(), role: 'vendor' }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

function generateRefreshToken(user) {
  return jwt.sign({ id: user._id.toString(), role: 'vendor' }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  });
}

function accessCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * DAY_MS,
  };
}

// Scoped to /api/auth so this cookie is only ever sent to the
// refresh/logout endpoints, not on every API request.
//
// Always carries an explicit maxAge — never a session-only cookie. A
// session cookie (no Max-Age/Expires) is unreliable on mobile: the OS
// frequently kills a backgrounded PWA and treats relaunch as a fresh
// browsing session, silently wiping it and forcing a re-login every time
// even though the JWT inside it is still perfectly valid. rememberMe only
// changes how long that persistence lasts, not whether it persists.
function refreshCookieOptions(rememberMe) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/auth',
    maxAge: (rememberMe ? 30 : 7) * DAY_MS,
  };
}

function setAuthCookies(res, user, rememberMe) {
  res.cookie('accessToken', generateAccessToken(user), accessCookieOptions());
  res.cookie('refreshToken', generateRefreshToken(user), refreshCookieOptions(rememberMe));
}

function clearAuthCookies(res) {
  res.clearCookie('accessToken', { path: '/' });
  res.clearCookie('refreshToken', { path: '/api/auth' });
}

// ── Super admin (single env-based credential, no User doc — see
// adminAuth.controller.js) ─────────────────────────────────────────
// Distinct cookie names (adminAccessToken/adminRefreshToken) from the
// vendor cookies above so a browser can hold an admin session and a
// vendor session at the same time without either clobbering the other.

function generateAdminAccessToken() {
  return jwt.sign({ role: 'admin' }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

function generateAdminRefreshToken() {
  return jwt.sign({ role: 'admin' }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  });
}

function adminAccessCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * DAY_MS,
  };
}

// Scoped to /api/admin/auth so this cookie is only ever sent to the
// admin refresh/logout endpoints, not on every API request.
function adminRefreshCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/admin/auth',
    maxAge: 30 * DAY_MS,
  };
}

function setAdminAuthCookies(res) {
  res.cookie('adminAccessToken', generateAdminAccessToken(), adminAccessCookieOptions());
  res.cookie('adminRefreshToken', generateAdminRefreshToken(), adminRefreshCookieOptions());
}

function clearAdminAuthCookies(res) {
  res.clearCookie('adminAccessToken', { path: '/' });
  res.clearCookie('adminRefreshToken', { path: '/api/admin/auth' });
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  accessCookieOptions,
  refreshCookieOptions,
  setAuthCookies,
  clearAuthCookies,
  generateAdminAccessToken,
  generateAdminRefreshToken,
  adminAccessCookieOptions,
  adminRefreshCookieOptions,
  setAdminAuthCookies,
  clearAdminAuthCookies,
};
