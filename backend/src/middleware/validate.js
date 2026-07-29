const { validationResult } = require('express-validator');

/**
 * Pairs with express-validator check chains, e.g.:
 *   router.post('/signup', [body('email').isEmail()], validate, controller.signup)
 * No routes attach chains yet since there's nothing to validate until
 * each endpoint gets its real implementation.
 */
module.exports = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();

  res.status(400).json({
    success: false,
    message: 'Validation failed',
    errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
  });
};
