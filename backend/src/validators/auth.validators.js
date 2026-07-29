const { body } = require('express-validator');

// Min 8 chars, at least one uppercase letter, one number, one special char.
const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

exports.signupValidators = [
  body('email').isEmail().withMessage('Enter a valid email address').normalizeEmail(),
  body('mobileNo').matches(/^\d{7,15}$/).withMessage('Enter a valid mobile number'),
  body('password')
    .matches(PASSWORD_REGEX)
    .withMessage('Password must be at least 8 characters and include an uppercase letter, a number, and a special character'),
  body('confirmPassword').custom((value, { req }) => value === req.body.password).withMessage('Passwords do not match'),
  body('acceptedTerms')
    .custom((value) => value === true || value === 'true')
    .withMessage('You must accept the terms and conditions'),
];

exports.verifyEmailValidators = [
  body('email').isEmail().withMessage('Enter a valid email address').normalizeEmail(),
  body('otp').isLength({ min: 6, max: 6 }).isNumeric().withMessage('Enter the 6-digit verification code'),
  body('businessName').trim().notEmpty().withMessage('Business name is required'),
  body('businessType').trim().notEmpty().withMessage('Business type is required'),
  body('industry').trim().notEmpty().withMessage('Industry is required'),
];

exports.resendVerificationValidators = [
  body('email').isEmail().withMessage('Enter a valid email address').normalizeEmail(),
];

exports.loginValidators = [
  body('email').isEmail().withMessage('Enter a valid email address').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
];

exports.forgotPasswordValidators = [
  body('email').isEmail().withMessage('Enter a valid email address').normalizeEmail(),
];

exports.resetPasswordValidators = [
  body('token').notEmpty().withMessage('Reset token is required'),
  body('newPassword')
    .matches(PASSWORD_REGEX)
    .withMessage('Password must be at least 8 characters and include an uppercase letter, a number, and a special character'),
  body('confirmPassword').custom((value, { req }) => value === req.body.newPassword).withMessage('Passwords do not match'),
];
