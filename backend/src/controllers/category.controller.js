const mongoose = require('mongoose');
const Category = require('../models/Category');
const Product = require('../models/Product');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');

async function toCategoryResponse(category) {
  const productCount = await Product.countDocuments({ categoryId: category._id });
  return {
    id: category._id,
    name: category.name,
    description: category.description,
    productCount,
    createdAt: category.createdAt,
  };
}

exports.getCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find({ vendorId: req.user.id }).sort({ name: 1 });
  res.json({ success: true, categories: await Promise.all(categories.map(toCategoryResponse)) });
});

exports.createCategory = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  if (!name || !name.trim()) {
    throw new AppError('Category name is required', 400);
  }

  const escaped = name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const existing = await Category.findOne({ vendorId: req.user.id, name: new RegExp(`^${escaped}$`, 'i') });
  if (existing) {
    throw new AppError('A category with this name already exists', 409);
  }

  const category = await Category.create({ vendorId: req.user.id, name: name.trim(), description });
  res.status(201).json({ success: true, message: 'Category created successfully', category: await toCategoryResponse(category) });
});

exports.updateCategory = asyncHandler(async (req, res) => {
  const { categoryId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(categoryId)) {
    throw new AppError('Category not found', 404);
  }
  const category = await Category.findOne({ _id: categoryId, vendorId: req.user.id });
  if (!category) {
    throw new AppError('Category not found', 404);
  }

  const { name, description } = req.body;
  if (!name || !name.trim()) {
    throw new AppError('Category name is required', 400);
  }

  const escaped = name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const existing = await Category.findOne({
    vendorId: req.user.id,
    _id: { $ne: categoryId },
    name: new RegExp(`^${escaped}$`, 'i'),
  });
  if (existing) {
    throw new AppError('A category with this name already exists', 409);
  }

  category.name = name.trim();
  category.description = description;
  await category.save();

  res.json({ success: true, message: 'Category updated successfully', category: await toCategoryResponse(category) });
});

exports.deleteCategory = asyncHandler(async (req, res) => {
  const { categoryId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(categoryId)) {
    throw new AppError('Category not found', 404);
  }
  const category = await Category.findOne({ _id: categoryId, vendorId: req.user.id });
  if (!category) {
    throw new AppError('Category not found', 404);
  }

  const productCount = await Product.countDocuments({ categoryId: category._id });
  if (productCount > 0) {
    throw new AppError(`Cannot delete — ${productCount} product(s) use this category`, 409);
  }

  await category.deleteOne();
  res.json({ success: true, message: 'Category deleted successfully' });
});
