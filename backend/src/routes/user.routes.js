const express = require('express');
const userController = require('../controllers/user.controller');
const { authenticate, authorize } = require('../middleware/auth');
const { profileImagesUpload } = require('../middleware/upload');
const validate = require('../middleware/validate');
const {
  updateProfileValidators,
  changePasswordValidators,
  setSubdomainValidators,
  setCustomDomainValidators,
  setPrimaryCatalogValidators,
} = require('../validators/user.validators');

const router = express.Router();

router.use(authenticate, authorize('vendor'));

router.get('/profile', userController.getProfile);
router.put('/profile', profileImagesUpload, updateProfileValidators, validate, userController.updateProfile);
router.put('/change-password', changePasswordValidators, validate, userController.changePassword);
router.put('/subdomain', setSubdomainValidators, validate, userController.setSubdomain);
router.delete('/subdomain', userController.removeSubdomain);
router.put('/custom-domain', setCustomDomainValidators, validate, userController.setCustomDomain);
router.delete('/custom-domain', userController.removeCustomDomain);
router.put('/primary-catalog', setPrimaryCatalogValidators, validate, userController.setPrimaryCatalog);
// Real upgrade flow lives under /api/payments/razorpay/... (payment.routes.js)
router.delete('/account', userController.deleteAccount);

module.exports = router;
