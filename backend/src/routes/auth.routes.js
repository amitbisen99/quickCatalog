const express = require('express');
const authController = require('../controllers/auth.controller');
const { authLimiter } = require('../middleware/rateLimiter');
const validate = require('../middleware/validate');
const {
  signupValidators,
  verifyEmailValidators,
  resendVerificationValidators,
  loginValidators,
  forgotPasswordValidators,
  resetPasswordValidators,
} = require('../validators/auth.validators');

const router = express.Router();

// All unauthenticated and abuse-prone — stricter rate limit than the
// global default.
router.post('/signup', authLimiter, signupValidators, validate, authController.signup);
router.post('/login', authLimiter, loginValidators, validate, authController.login);
router.post('/verify-email', authLimiter, verifyEmailValidators, validate, authController.verifyEmail);
router.post(
  '/resend-verification',
  authLimiter,
  resendVerificationValidators,
  validate,
  authController.resendVerification
);
router.post('/forgot-password', authLimiter, forgotPasswordValidators, validate, authController.forgotPassword);
router.post('/reset-password', authLimiter, resetPasswordValidators, validate, authController.resetPassword);
// Cookie-gated (needs a valid refresh token), not a raw public auth
// attempt — doesn't need the stricter authLimiter.
router.post('/refresh', authController.refreshToken);
router.post('/logout', authController.logout);

module.exports = router;
