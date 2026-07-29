const rateLimit = require('express-rate-limit');

const windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000;

// Rate limiting exists to slow down abuse from many distinct clients — in
// local dev every request comes from the same machine, so it just throttles
// normal use instead. Skip it outside production rather than tuning the
// numbers up, since there's no meaningful limit that works for both cases.
const isProduction = process.env.NODE_ENV === 'production';

// Applied to all /api routes.
exports.globalLimiter = rateLimit({
  windowMs,
  max: Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => !isProduction,
  message: { success: false, message: 'Too many requests, please try again later.' },
});

// Tighter limit for auth + other unauthenticated, abuse-prone endpoints.
exports.authLimiter = rateLimit({
  windowMs,
  max: Number(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS) || 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => !isProduction,
  message: { success: false, message: 'Too many attempts, please try again later.' },
});
