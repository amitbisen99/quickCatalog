const express = require('express');
const paymentController = require('../controllers/payment.controller');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { verifyPaymentValidators } = require('../validators/payment.validators');

const router = express.Router();

router.use(authenticate, authorize('vendor'));

router.get('/plan-price', paymentController.getPlanPrice);
router.post('/razorpay/order', paymentController.createRazorpayOrder);
router.post('/razorpay/verify', verifyPaymentValidators, validate, paymentController.verifyRazorpayPayment);

module.exports = router;
