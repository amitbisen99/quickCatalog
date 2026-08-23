const { body } = require('express-validator');
const { CATALOG_TEMPLATE_IDS } = require('../utils/catalogTemplates');
const { RESERVED_SUBDOMAINS } = require('../utils/reservedSubdomains');

// Standard DNS label rules: lowercase alphanumeric + hyphens, 3-63 chars,
// can't start or end with a hyphen. Matches what generateUniqueSlug's
// output looks like too, so the two stay visually consistent.
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

exports.createCatalogValidators = [
  body('name').trim().notEmpty().withMessage('Catalog name is required'),
  body('description').optional().trim().isLength({ max: 200 }).withMessage('Description must be 200 characters or less'),
  body('template').optional().isIn(CATALOG_TEMPLATE_IDS).withMessage('Invalid template'),
];

// Update is a partial update — the name/description form and the
// template picker each PUT only the fields they own, so name must stay
// optional here (still validated as non-empty when it IS sent).
exports.updateCatalogValidators = [
  body('name').optional().trim().notEmpty().withMessage('Catalog name is required'),
  body('description').optional().trim().isLength({ max: 200 }).withMessage('Description must be 200 characters or less'),
  body('template').optional().isIn(CATALOG_TEMPLATE_IDS).withMessage('Invalid template'),
];
