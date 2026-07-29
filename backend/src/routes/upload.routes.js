const express = require('express');
const uploadController = require('../controllers/upload.controller');
const { authenticate, authorize } = require('../middleware/auth');
const { excelUpload } = require('../middleware/upload');

const router = express.Router();

router.use(authenticate, authorize('vendor'));

router.post('/images', uploadController.uploadImages);
router.post('/video', uploadController.uploadVideo);
router.post('/file', uploadController.uploadFile);
router.post('/parse-catalog', excelUpload, uploadController.parseCatalog);

module.exports = router;
