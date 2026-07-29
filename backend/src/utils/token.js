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
function refreshCookieOptions(rememberMe) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/auth',
    ...(rememberMe ? { maxAge: 30 * DAY_MS } : {}),
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

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  accessCookieOptions,
  refreshCookieOptions,
  setAuthCookies,
  clearAuthCookies,
};
