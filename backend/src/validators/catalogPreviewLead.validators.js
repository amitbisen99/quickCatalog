const { body } = require('express-validator');

exports.catalogPreviewLeadValidators = [
  body('fullName').trim().notEmpty().withMessage('Full name is required').isLength({ max: 100 }),
  body('email').trim().notEmpty().withMessage('Email is required').isEmail().withMessage('Enter a valid email'),
  body('whatsappNo')
    .trim()
    .notEmpty()
    .withMessage('WhatsApp number is required')
    .isLength({ min: 7, max: 20 })
    .withMessage('Enter a valid WhatsApp number'),
  body('industry').trim().notEmpty().withMessage('Please select your industry'),
  body('numberOfProducts')
    .notEmpty()
    .withMessage('Number of products is required')
    .bail()
    .isInt({ min: 1, max: 100000 })
    .withMessage('Enter a valid number of products'),
];
