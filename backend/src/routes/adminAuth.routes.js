const express = require('express');
const adminAuthController = require('../controllers/adminAuth.controller');
const { authenticateAdmin } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');
const validate = require('../middleware/validate');
const { loginValidators } = require('../validators/adminAuth.validators');

// Kept entirely separate from admin.routes.js (which gates everything in
// it behind authenticateAdmin) so the login route itself is never
// accidentally requires-auth-to-reach-auth.
const router = express.Router();

router.post('/login', authLimiter, loginValidators, validate, adminAuthController.login);
router.post('/refresh', adminAuthController.refreshToken);
router.post('/logout', adminAuthController.logout);
router.get('/me', authenticateAdmin, adminAuthController.me);

module.exports = router;
