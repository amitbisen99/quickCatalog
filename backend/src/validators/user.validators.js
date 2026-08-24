const { body } = require('express-validator');
const { CURRENCY_CODES } = require('../utils/currencies');
const { RESERVED_SUBDOMAINS } = require('../utils/reservedSubdomains');

const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

// Standard DNS label rules: lowercase alphanumeric + hyphens, 3-63 chars,
// can't start or end with a hyphen.
const SUBDOMAIN_PATTERN = /^[a-z0-9]([a-z0-9-]{1,61}[a-z0-9])?$/;

exports.setSubdomainValidators = [
  body('subdomain')
    .trim()
    .toLowerCase()
    .notEmpty()
    .withMessage('Subdomain is required')
    .isLength({ min: 3, max: 63 })
    .withMessage('Subdomain must be between 3 and 63 characters')
    .matches(SUBDOMAIN_PATTERN)
    .withMessage('Subdomain can only contain lowercase letters, numbers, and hyphens (not at the start or end)')
    .custom((value) => !RESERVED_SUBDOMAINS.has(value))
    .withMessage('That subdomain is reserved — please choose another'),
];

exports.setCustomDomainValidators = [
  body('customDomain')
    .trim()
    .toLowerCase()
    .notEmpty()
    .withMessage('Domain is required')
    .isFQDN()
    .withMessage('Enter a valid domain (e.g. catalog.yourbrand.com)'),
];

exports.setPrimaryCatalogValidators = [
  body('catalogId').isMongoId().withMessage('Invalid catalog'),
];

exports.updateProfileValidators = [
  body('mobileNo').matches(/^\d{7,15}$/).withMessage('Enter a valid mobile number'),
  body('countryCode').matches(/^\+\d{1,4}$/).withMessage('Select a valid country code'),
  body('businessName').trim().notEmpty().withMessage('Business name is required'),
  body('businessType').trim().notEmpty().withMessage('Business type is required'),
  body('industry').trim().notEmpty().withMessage('Industry is required'),
  body('currency').optional().isIn(CURRENCY_CODES).withMessage('Invalid currency'),
];

exports.changePasswordValidators = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .matches(PASSWORD_REGEX)
    .withMessage('Password must be at least 8 characters and include an uppercase letter, a number, and a special character'),
  body('confirmPassword').custom((value, { req }) => value === req.body.newPassword).withMessage('Passwords do not match'),
];
