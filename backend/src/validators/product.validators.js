const { body } = require('express-validator');

exports.productValidators = [
  body('name').trim().notEmpty().withMessage('Product name is required'),
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
