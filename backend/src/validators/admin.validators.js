const { body } = require('express-validator');

// 'unverified' is deliberately not allowed here — that's a signup-flow-only
// state, not something an admin should be able to set a vendor back to.
exports.updateUserStatusValidators = [
  body('status').isIn(['verified', 'inactive']).withMessage('Status must be "verified" or "inactive"'),
];

exports.updateTicketStatusValidators = [
  body('status').isIn(['open', 'in_progress', 'closed']).withMessage('Invalid status'),
];

exports.replyToTicketValidators = [body('message').trim().notEmpty().withMessage('Reply message is required')];

exports.updatePlanPricingValidators = [
  body('indiaPriceInr').isFloat({ min: 0 }).withMessage('Enter a valid India price'),
  body('internationalPriceUsd').isFloat({ min: 0 }).withMessage('Enter a valid international price'),
];

exports.updateDomainRequestValidators = [
  body('type').isIn(['subdomain', 'customDomain']).withMessage('Invalid domain type'),
  body('status').isIn(['active', 'failed']).withMessage('Invalid status'),
];
