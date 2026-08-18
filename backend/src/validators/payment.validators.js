const { body } = require('express-validator');

exports.verifyPaymentValidators = [
  body('razorpayOrderId').trim().notEmpty().withMessage('Missing order id'),
  body('razorpayPaymentId').trim().notEmpty().withMessage('Missing payment id'),
  body('razorpaySignature').trim().notEmpty().withMessage('Missing signature'),
];
