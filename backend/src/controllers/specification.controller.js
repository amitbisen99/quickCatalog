const mongoose = require('mongoose');
const Specification = require('../models/Specification');
const Product = require('../models/Product');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');

async function toSpecificationResponse(spec) {
  const productCount = await Product.countDocuments({
    vendorId: spec.vendorId,
    [`specifications.${spec.name}`]: { $exists: true },
  });
  return {
    id: spec._id,
    name: spec.name,
    productCount,
    createdAt: spec.createdAt,
  };
}

exports.getSpecifications = asyncHandler(async (req, res) => {
  const specifications = await Specification.find({ vendorId: req.user.id }).sort({ name: 1 });
  res.json({ success: true, specifications: await Promise.all(specifications.map(toSpecificationResponse)) });
});

exports.createSpecification = asyncHandler(async (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) {
    throw new AppError('Specification name is required', 400);
  }

  const escaped = name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const existing = await Specification.findOne({ vendorId: req.user.id, name: new RegExp(`^${escaped}$`, 'i') });
  if (existing) {
    throw new AppError('A specification with this name already exists', 409);
  }

  const specification = await Specification.create({ vendorId: req.user.id, name: name.trim() });
  res.status(201).json({
    success: true,
    message: 'Specification created successfully',
    specification: await toSpecificationResponse(specification),
  });
});

exports.updateSpecification = asyncHandler(async (req, res) => {
  const { specId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(specId)) {
    throw new AppError('Specification not found', 404);
  }
  const specification = await Specification.findOne({ _id: specId, vendorId: req.user.id });
  if (!specification) {
    throw new AppError('Specification not found', 404);
  }

  const { name } = req.body;
  if (!name || !name.trim()) {
    throw new AppError('Specification name is required', 400);
  }

  // Product documents key their spec values by this name directly, so a
  // rename would orphan existing data — block it while the spec is in use
  // rather than silently leaving mismatched keys behind.
  const inUse = await Product.countDocuments({
    vendorId: req.user.id,
    [`specifications.${specification.name}`]: { $exists: true },
  });
  if (inUse > 0) {
    throw new AppError(`Cannot rename — ${inUse} product(s) use this specification`, 409);
  }

  const escaped = name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const existing = await Specification.findOne({
    vendorId: req.user.id,
    _id: { $ne: specId },
    name: new RegExp(`^${escaped}$`, 'i'),
  });
  if (existing) {
    throw new AppError('A specification with this name already exists', 409);
  }

  specification.name = name.trim();
  await specification.save();

  res.json({
    success: true,
    message: 'Specification updated successfully',
    specification: await toSpecificationResponse(specification),
  });
});

exports.deleteSpecification = asyncHandler(async (req, res) => {
  const { specId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(specId)) {
    throw new AppError('Specification not found', 404);
  }
  const specification = await Specification.findOne({ _id: specId, vendorId: req.user.id });
  if (!specification) {
    throw new AppError('Specification not found', 404);
  }

  const inUse = await Product.countDocuments({
    vendorId: req.user.id,
    [`specifications.${specification.name}`]: { $exists: true },
  });
  if (inUse > 0) {
    throw new AppError(`Cannot delete — ${inUse} product(s) use this specification`, 409);
  }

  await specification.deleteOne();
  res.json({ success: true, message: 'Specification deleted successfully' });
});
