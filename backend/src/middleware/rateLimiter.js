const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { isInternalRequest } = require('../utils/internalRequest');

const { ipKeyGenerator } = rateLimit;

const windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000;

// Rate limiting exists to slow down abuse from many distinct clients — in
// local dev every request comes from the same machine, so it just throttles
// normal use instead. Skip it outside production rather than tuning the
// numbers up, since there's no meaningful limit that works for both cases.
const isProduction = process.env.NODE_ENV === 'production';

// Buckets a request by the ACCOUNT making it — a decoded vendor or admin
// session — rather than by IP. Two unrelated vendors (or a vendor and the
// admin) sharing an office network, a mobile carrier's NAT, or a corporate
// VPN would otherwise share one budget and lock each other out over
// traffic that has nothing to do with them. There's exactly one admin
// account, so authenticated admin traffic all keys to one literal string —
// still its own bucket, separate from every vendor. Falls back to IP only
// when there's no session yet (login/signup/OTP, which authLimiter covers
// far more tightly anyway, and anonymous public-catalog browsing — that
// traffic has no account to key on by definition). Never throws: a
// missing, expired, or forged token is simply not a match, same as no
// token at all.
function accountKey(req) {
  const adminToken = req.cookies?.adminAccessToken;
  if (adminToken) {
    try {
      const decoded = jwt.verify(adminToken, process.env.JWT_SECRET);
      if (decoded.role === 'admin') return 'account:admin';
    } catch {
      // Not a valid admin session — fall through to the other checks.
    }
  }
  const vendorToken = req.cookies?.accessToken;
  if (vendorToken) {
    try {
      const decoded = jwt.verify(vendorToken, process.env.JWT_SECRET);
      if (decoded.role === 'vendor' && decoded.id) return `account:vendor:${decoded.id}`;
    } catch {
      // Not a valid vendor session — fall through to IP.
    }
  }
  return `ip:${ipKeyGenerator(req.ip)}`;
}

// Tells a blocked client how long to actually wait, computed from this
// bucket's real reset time rather than assuming the full window — a client
// blocked one second before its window resets would otherwise be told to
// wait the full 15 minutes.
function rateLimitHandler(req, res) {
  const resetTime = req.rateLimit?.resetTime;
  const retryAfterSeconds = resetTime
    ? Math.max(1, Math.ceil((resetTime.getTime() - Date.now()) / 1000))
    : Math.ceil(windowMs / 1000);
  res.setHeader('Retry-After', String(retryAfterSeconds));
  res.status(429).json({
    success: false,
    message: 'Too many requests, please try again later.',
    retryAfterSeconds,
  });
}

// Applied to all /api routes. This is only a coarse flood guard — login,
// signup, OTP and the public upload form have the much tighter authLimiter
// below — so it has to leave room for normal use of the dashboard. That's
// far more than it looks: adding N existing products to a catalog is N
// requests, product search fires one per keystroke, and one page load is
// several calls.
//
// Exempts this app's own Next.js server (isInternalRequest) — without that,
// its server-rendered public-catalog fetches all land in one IP bucket
// shared by every visitor of every vendor's catalog, which gets worse, not
// better, as more vendors join.
exports.globalLimiter = rateLimit({
  windowMs,
  max: Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 1000,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => !isProduction || isInternalRequest(req),
  keyGenerator: accountKey,
  handler: rateLimitHandler,
});

// Tighter limit for auth + other unauthenticated, abuse-prone endpoints.
// Deliberately still keyed by IP (express-rate-limit's default), not
// account — there's no session yet at login/signup/OTP, and this is
// exactly the brute-force surface a per-IP limit exists to slow down.
exports.authLimiter = rateLimit({
  windowMs,
  max: Number(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS) || 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => !isProduction,
  message: { success: false, message: 'Too many attempts, please try again later.' },
});
