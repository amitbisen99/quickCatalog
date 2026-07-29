const { body } = require('express-validator');
const { CATALOG_TEMPLATE_IDS } = require('../utils/catalogTemplates');

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
