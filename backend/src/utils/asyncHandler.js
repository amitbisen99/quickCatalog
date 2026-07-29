/**
 * Wraps an async route handler so rejected promises reach the centralized
 * error handler instead of becoming unhandled rejections.
 */
module.exports = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
