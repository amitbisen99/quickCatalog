const rateLimit = require('express-rate-limit');

const windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000;

// Rate limiting exists to slow down abuse from many distinct clients — in
// local dev every request comes from the same machine, so it just throttles
// normal use instead. Skip it outside production rather than tuning the
// numbers up, since there's no meaningful limit that works for both cases.
const isProduction = process.env.NODE_ENV === 'production';

// Applied to all /api routes. This is only a coarse flood guard — login,
// signup, OTP and the public upload form have the much tighter authLimiter
// below — so it has to leave room for normal use of the dashboard. That's
// far more than it looks: adding N existing products to a catalog is N
// requests, product search fires one per keystroke, and one page load is
// several calls. At the old 100 per 15 minutes a single vendor doing a bulk
// action locked themselves out of everything until the window reset.
// Keyed per IP, so the Next server's own server-rendered fetches for public
// catalog pages all share one bucket — another reason it needs headroom.
exports.globalLimiter = rateLimit({
  windowMs,
  max: Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 1000,
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
