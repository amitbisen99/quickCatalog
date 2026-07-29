const { body } = require('express-validator');

exports.createEnquiryValidators = [
  body('customerName').trim().notEmpty().withMessage('Name is required'),
  body('customerMobile').matches(/^\d{7,15}$/).withMessage('Enter a valid mobile number'),
  body('customerEmail').optional({ checkFalsy: true }).isEmail().withMessage('Enter a valid email'),
  body('items').isArray({ min: 1 }).withMessage('Select at least one product'),
  body('items.*.productId').isMongoId().withMessage('Invalid product'),
  body('items.*.quantity').optional().isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
];

exports.updateEnquiryStatusValidators = [
  body('status').isIn(['new', 'contacted', 'closed']).withMessage('Invalid status'),
];
