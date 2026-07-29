const express = require('express');
const userController = require('../controllers/user.controller');
const { authenticate, authorize } = require('../middleware/auth');
const { profileImagesUpload } = require('../middleware/upload');
const validate = require('../middleware/validate');
const { updateProfileValidators, changePasswordValidators } = require('../validators/user.validators');

const router = express.Router();

router.use(authenticate, authorize('vendor'));

router.get('/profile', userController.getProfile);
router.put('/profile', profileImagesUpload, updateProfileValidators, validate, userController.updateProfile);
router.put('/change-password', changePasswordValidators, validate, userController.changePassword);
router.delete('/account', userController.deleteAccount);

module.exports = router;
