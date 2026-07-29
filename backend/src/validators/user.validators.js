const { body } = require('express-validator');
const { CURRENCY_CODES } = require('../utils/currencies');

const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

exports.updateProfileValidators = [
  body('mobileNo').matches(/^\d{7,15}$/).withMessage('Enter a valid mobile number'),
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
