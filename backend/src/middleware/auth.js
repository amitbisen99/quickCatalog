const jwt = require('jsonwebtoken');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Verifies the access token (httpOnly cookie primary, Bearer header
 * fallback for tooling/tests) and attaches the decoded payload to
 * req.user. Actual token issuance lands in Phase 2 (auth endpoints).
 */
exports.authenticate = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const token = req.cookies?.accessToken || bearerToken;

  if (!token) {
    return next(new AppError('Authentication required', 401));
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    next(new AppError('Invalid or expired token', 401));
  }
});

/**
 * Same shape as authenticate(), but reads the adminAccessToken cookie
 * instead — a separate cookie so an admin session and a vendor session
 * can coexist in the same browser without either overwriting the other.
 */
exports.authenticateAdmin = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const token = req.cookies?.adminAccessToken || bearerToken;

  if (!token) {
    return next(new AppError('Authentication required', 401));
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    next(new AppError('Invalid or expired token', 401));
  }
});

/**
 * Role gate — call after authenticate(). Vendor routes use
 * authorize('vendor'); the super admin panel uses authorize('admin').
 */
exports.authorize = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return next(new AppError('You do not have permission to perform this action', 403));
  }
  next();
};
