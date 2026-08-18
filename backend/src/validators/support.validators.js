const { body } = require('express-validator');

exports.createTicketValidators = [
  body('reason')
    .trim()
    .notEmpty()
    .withMessage('Reason for contact is required')
    .isLength({ max: 500 })
    .withMessage('Reason must be 500 characters or fewer'),
  body('contactPersonName').trim().notEmpty().withMessage('Person to contact is required'),
  body('contactMethod').isIn(['email', 'mobile']).withMessage('Choose email or mobile'),
  // Same shapes auth.validators.js/user.validators.js already validate
  // (isEmail() for email, the 7-15-digit regex for mobile) — just applied
  // conditionally on which contact method was chosen.
  body('contactValue')
    .trim()
    .notEmpty()
    .withMessage('Enter your contact details'),
  body('contactValue')
    .if(body('contactMethod').equals('email'))
    .isEmail()
    .withMessage('Enter a valid email address'),
  body('contactValue')
    .if(body('contactMethod').equals('mobile'))
    .matches(/^\d{7,15}$/)
    .withMessage('Enter a valid mobile number'),
];
