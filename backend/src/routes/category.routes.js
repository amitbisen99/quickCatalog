const express = require('express');
const categoryController = require('../controllers/category.controller');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate, authorize('vendor'));

router.get('/', categoryController.getCategories);
router.post('/', categoryController.createCategory);
router.put('/:categoryId', categoryController.updateCategory);
router.delete('/:categoryId', categoryController.deleteCategory);

module.exports = router;
