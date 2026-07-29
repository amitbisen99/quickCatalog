const express = require('express');
const specificationController = require('../controllers/specification.controller');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate, authorize('vendor'));

router.get('/', specificationController.getSpecifications);
router.post('/', specificationController.createSpecification);
router.put('/:specId', specificationController.updateSpecification);
router.delete('/:specId', specificationController.deleteSpecification);

module.exports = router;
