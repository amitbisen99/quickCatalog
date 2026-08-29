const { body } = require('express-validator');

exports.productValidators = [
  body('name').trim().notEmpty().withMessage('Product name is required'),
  body('sku').optional({ checkFalsy: true }).trim().isLength({ max: 100 }).withMessage('SKU must be 100 characters or fewer'),
  body('description').optional().trim(),
  body('price')
    .notEmpty()
    .withMessage('Price is required')
    .bail()
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
  body('unit').optional().trim(),
  body('minimumOrderQuantity')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Minimum order quantity must be at least 1'),
  body('categoryId').optional({ checkFalsy: true }).isMongoId().withMessage('Invalid category'),
  body('video').optional({ checkFalsy: true }).trim(),
  body('specifications').optional(),
  body('taxPercent').optional({ checkFalsy: true }).isFloat({ min: 0, max: 100 }).withMessage('Tax must be between 0 and 100'),
];

// Capped at 2000 — comfortably above any real catalog size, just a
// sanity ceiling against an accidental or malicious oversized payload.
exports.bulkPriceValidators = [
  body('updates').isArray({ min: 1, max: 2000 }).withMessage('Provide 1–2000 products to update'),
  body('updates.*.productId').isMongoId().withMessage('Invalid product id'),
  body('updates.*.price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
];

exports.bulkCategoryValidators = [
  body('productIds').isArray({ min: 1, max: 2000 }).withMessage('Provide 1–2000 products to update'),
  body('productIds.*').isMongoId().withMessage('Invalid product id'),
  body('categoryId').optional({ checkFalsy: true }).isMongoId().withMessage('Invalid category'),
];
