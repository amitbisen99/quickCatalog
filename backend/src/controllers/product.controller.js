const mongoose = require('mongoose');
const XLSX = require('xlsx');
const Product = require('../models/Product');
const Catalog = require('../models/Catalog');
const Category = require('../models/Category');
const Specification = require('../models/Specification');
const User = require('../models/User');
const { compressImageToDataUrl } = require('../utils/imageProcessor');
const { parseWorkbook } = require('../utils/excelParser');
const { normalizeBulkProductRow, HEADERS: BULK_HEADERS } = require('../utils/normalizeBulkProductRow');
const findOrCreateCategory = require('../utils/findOrCreateCategory');
const findOrCreateSpecification = require('../utils/findOrCreateSpecification');
const readImagesZip = require('../utils/readImagesZip');
const resolveRowImages = require('../utils/resolveRowImages');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { FREE_PRODUCT_LIMIT, exceedsFreeProductLimit } = require('../utils/planLimits');

const PAGE_SIZE = 20;

// additionalCount > 0 also enforces the free-tier per-catalog product cap
// — pass the number of products this request is about to add (e.g. 1 for
// a single create/link). Callers that only read or remove products (list,
// unlink) leave it at 0 and skip the check (and its extra queries)
// entirely. When a cap check is needed, the catalog/user/existing-count
// lookups don't depend on each other, so they run in parallel.
async function requireOwnedCatalog(catalogId, vendorId, additionalCount = 0) {
  if (!mongoose.Types.ObjectId.isValid(catalogId)) {
    throw new AppError('Catalog not found', 404);
  }

  const needsCapCheck = additionalCount > 0;
  const [catalog, user, existingCount] = await Promise.all([
    Catalog.findOne({ _id: catalogId, vendorId }),
    needsCapCheck ? User.findById(vendorId).select('subscriptionType') : null,
    needsCapCheck ? Product.countDocuments({ catalogIds: catalogId }) : null,
  ]);

  if (!catalog) {
    throw new AppError('Catalog not found', 404);
  }

  if (needsCapCheck && exceedsFreeProductLimit(user, existingCount, additionalCount)) {
    throw new AppError(
      `Free plan is limited to ${FREE_PRODUCT_LIMIT} products per catalog. Upgrade to add more.`,
      403
    );
  }

  return catalog;
}

function toProductResponse(product) {
  return {
    id: product._id,
    vendorId: product.vendorId,
    catalogIds: product.catalogIds,
    name: product.name,
    description: product.description,
    price: product.price,
    taxPercent: product.taxPercent,
    unit: product.unit,
    minimumOrderQuantity: product.minimumOrderQuantity,
    images: product.images,
    video: product.video,
    categoryId: product.categoryId,
    specifications: Object.fromEntries(product.specifications || new Map()),
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
}

function parseSpecifications(req) {
  if (!req.body.specifications) return {};
  try {
    return JSON.parse(req.body.specifications);
  } catch (err) {
    throw new AppError('Invalid specifications payload', 400);
  }
}

function buildSearchFilter(req) {
  const filter = {};
  if (req.query.categoryId) {
    filter.categoryId = req.query.categoryId;
  }
  if (req.query.search) {
    const escaped = String(req.query.search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.name = new RegExp(escaped, 'i');
  }
  return filter;
}

// ── Catalog-scoped: the association between a catalog and its products ──

exports.getProductsInCatalog = asyncHandler(async (req, res) => {
  const { catalogId } = req.params;
  await requireOwnedCatalog(catalogId, req.user.id);

  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.max(parseInt(req.query.limit, 10) || PAGE_SIZE, 1);
  const filter = { ...buildSearchFilter(req), catalogIds: catalogId };

  const [products, total] = await Promise.all([
    Product.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Product.countDocuments(filter),
  ]);

  res.json({
    success: true,
    products: products.map(toProductResponse),
    pagination: { page, limit, total, totalPages: Math.max(Math.ceil(total / limit), 1) },
  });
});

exports.createProduct = asyncHandler(async (req, res) => {
  const { catalogId } = req.params;
  await requireOwnedCatalog(catalogId, req.user.id, 1);

  const { name, description, price, unit, minimumOrderQuantity, categoryId, video, taxPercent } = req.body;
  const images = (await Promise.all((req.files || []).map((f) => compressImageToDataUrl(f.buffer)))).slice(0, 3);
  const specifications = parseSpecifications(req);

  const product = await Product.create({
    vendorId: req.user.id,
    catalogIds: [catalogId],
    name,
    description,
    price,
    taxPercent: taxPercent || undefined,
    unit: unit || undefined,
    minimumOrderQuantity: minimumOrderQuantity || undefined,
    categoryId: categoryId || undefined,
    video: video || undefined,
    images,
    specifications,
  });

  res.status(201).json({
    success: true,
    message: 'Product created successfully',
    product: toProductResponse(product),
  });
});

// Adds an existing (already-owned) product to another catalog.
exports.linkExistingProduct = asyncHandler(async (req, res) => {
  const { catalogId, productId } = req.params;
  await requireOwnedCatalog(catalogId, req.user.id, 1);

  if (!mongoose.Types.ObjectId.isValid(productId)) {
    throw new AppError('Product not found', 404);
  }
  const product = await Product.findOne({ _id: productId, vendorId: req.user.id });
  if (!product) {
    throw new AppError('Product not found', 404);
  }

  await Product.updateOne({ _id: productId }, { $addToSet: { catalogIds: catalogId } });
  const updated = await Product.findById(productId);

  res.json({ success: true, message: 'Product added to catalog', product: toProductResponse(updated) });
});

// Removes a product from this catalog only — the product itself (and its
// presence in other catalogs) is untouched. Permanent deletion lives on
// the global /api/products resource below.
exports.unlinkProduct = asyncHandler(async (req, res) => {
  const { catalogId, productId } = req.params;
  await requireOwnedCatalog(catalogId, req.user.id);

  if (!mongoose.Types.ObjectId.isValid(productId)) {
    throw new AppError('Product not found', 404);
  }
  const product = await Product.findOne({ _id: productId, vendorId: req.user.id, catalogIds: catalogId });
  if (!product) {
    throw new AppError('Product not found in this catalog', 404);
  }

  await Product.updateOne({ _id: productId }, { $pull: { catalogIds: catalogId } });

  res.json({ success: true, message: 'Product removed from catalog' });
});

// ── Global: the vendor's product library, independent of any one catalog ──

// Creates a product with no catalog attachment yet — it lives in the
// vendor's library and can be linked to any catalog later via
// linkExistingProduct.
exports.createStandaloneProduct = asyncHandler(async (req, res) => {
  const { name, description, price, unit, minimumOrderQuantity, categoryId, video, taxPercent } = req.body;
  const images = (await Promise.all((req.files || []).map((f) => compressImageToDataUrl(f.buffer)))).slice(0, 3);
  const specifications = parseSpecifications(req);

  const product = await Product.create({
    vendorId: req.user.id,
    catalogIds: [],
    name,
    description,
    price,
    taxPercent: taxPercent || undefined,
    unit: unit || undefined,
    minimumOrderQuantity: minimumOrderQuantity || undefined,
    categoryId: categoryId || undefined,
    video: video || undefined,
    images,
    specifications,
  });

  res.status(201).json({
    success: true,
    message: 'Product created successfully',
    product: toProductResponse(product),
  });
});

exports.listVendorProducts = asyncHandler(async (req, res) => {
  const filter = { ...buildSearchFilter(req), vendorId: req.user.id };
  if (req.query.excludeCatalogId) {
    filter.catalogIds = { $ne: req.query.excludeCatalogId };
  }

  const products = await Product.find(filter).sort({ createdAt: -1 }).limit(50);
  res.json({ success: true, products: products.map(toProductResponse) });
});

exports.getProduct = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    throw new AppError('Product not found', 404);
  }
  const product = await Product.findOne({ _id: productId, vendorId: req.user.id });
  if (!product) {
    throw new AppError('Product not found', 404);
  }
  res.json({ success: true, product: toProductResponse(product) });
});

exports.updateProduct = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    throw new AppError('Product not found', 404);
  }
  const product = await Product.findOne({ _id: productId, vendorId: req.user.id });
  if (!product) {
    throw new AppError('Product not found', 404);
  }

  const { name, description, price, unit, minimumOrderQuantity, categoryId, video, taxPercent } = req.body;

  let existingImages = [];
  if (req.body.existingImages) {
    try {
      existingImages = JSON.parse(req.body.existingImages);
    } catch (err) {
      throw new AppError('Invalid existingImages payload', 400);
    }
  }
  const newImages = await Promise.all((req.files || []).map((f) => compressImageToDataUrl(f.buffer)));
  const specifications = parseSpecifications(req);

  product.name = name;
  product.description = description;
  product.price = price;
  product.taxPercent = taxPercent || undefined;
  product.unit = unit || undefined;
  product.minimumOrderQuantity = minimumOrderQuantity || undefined;
  product.categoryId = categoryId || undefined;
  product.video = video || undefined;
  product.images = [...existingImages, ...newImages].slice(0, 3);
  product.specifications = specifications;
  await product.save();

  res.json({ success: true, message: 'Product updated successfully', product: toProductResponse(product) });
});

// Removes the product entirely — from the vendor's library and every
// catalog it appeared in.
exports.deleteProduct = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    throw new AppError('Product not found', 404);
  }
  const product = await Product.findOneAndDelete({ _id: productId, vendorId: req.user.id });
  if (!product) {
    throw new AppError('Product not found', 404);
  }

  res.json({ success: true, message: 'Product deleted successfully' });
});

// Fixed-format .xlsx template for bulk product import — column headers
// match normalizeBulkProductRow's expectations exactly, so there's no
// column-mapping step (unlike the catalog-from-file wizard). Includes a
// second "Reference" tab listing the vendor's existing category and
// specification names, so they can be copied into a row exactly instead
// of retyped (typos would otherwise silently create duplicates).
exports.bulkImportSample = asyncHandler(async (req, res) => {
  const headers = Object.values(BULK_HEADERS);
  const examples = [
    [
      'Cotton T-Shirt',
      'Premium cotton round-neck t-shirt',
      499,
      'pcs',
      10,
      'Apparel',
      'Color: Red; Size: Large',
      5,
      'https://example.com/image1.jpg',
      '',
      '',
    ],
    [
      'Ceramic Mug',
      'Matte-finish 350ml mug',
      149,
      'pcs',
      25,
      'Home & Kitchen',
      'Material: Ceramic',
      '',
      '',
      'mug1.jpg',
      '',
    ],
  ];

  const workbook = XLSX.utils.book_new();
  const productsSheet = XLSX.utils.aoa_to_sheet([headers, ...examples]);
  XLSX.utils.book_append_sheet(workbook, productsSheet, 'Products');

  const [categories, specifications] = await Promise.all([
    Category.find({ vendorId: req.user.id }).sort({ name: 1 }),
    Specification.find({ vendorId: req.user.id }).sort({ name: 1 }),
  ]);
  const refRowCount = Math.max(categories.length, specifications.length, 1);
  const refRows = [['Your Existing Categories', 'Your Existing Specifications']];
  for (let i = 0; i < refRowCount; i += 1) {
    refRows.push([categories[i]?.name || '', specifications[i]?.name || '']);
  }
  const referenceSheet = XLSX.utils.aoa_to_sheet(refRows);
  XLSX.utils.book_append_sheet(workbook, referenceSheet, 'Reference');

  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="product-bulk-import-template.xlsx"');
  res.send(buffer);
});

// Bulk-creates standalone products (vendor library, no catalog attached
// yet — link them to catalogs afterward) from a file matching the
// bulkImportSample template, plus an optional ZIP of product photos.
exports.bulkImportProducts = asyncHandler(async (req, res) => {
  const excelFile = req.files?.file?.[0];
  if (!excelFile) {
    throw new AppError('No file uploaded', 400);
  }

  const { records } = parseWorkbook(excelFile.buffer);
  if (records.length === 0) {
    throw new AppError('No product rows found in this file', 400);
  }

  const zipFile = req.files?.imagesZip?.[0];
  const zipEntries = zipFile ? readImagesZip(zipFile.buffer) : null;

  const validRows = [];
  const errors = [];
  const warnings = [];
  const categoryCache = new Map();
  const specCache = new Map();

  for (let i = 0; i < records.length; i += 1) {
    const rowNumber = i + 2; // +1 for header row, +1 for 1-indexing
    const { data, error } = normalizeBulkProductRow(records[i]);
    if (error) {
      errors.push({ rowNumber, error });
      continue;
    }

    let categoryId;
    if (data.categoryName) {
      // eslint-disable-next-line no-await-in-loop
      categoryId = await findOrCreateCategory(req.user.id, data.categoryName, categoryCache);
    }

    // Keeps the vendor's Specification master list in sync — the value
    // itself is stored on the product keyed by name, not by this id.
    const specNames = Object.keys(data.specifications);
    for (let s = 0; s < specNames.length; s += 1) {
      // eslint-disable-next-line no-await-in-loop
      await findOrCreateSpecification(req.user.id, specNames[s], specCache);
    }

    // eslint-disable-next-line no-await-in-loop
    const images = await resolveRowImages(data, zipEntries, rowNumber, warnings);

    validRows.push({ ...data, categoryId, images });
  }

  if (validRows.length === 0) {
    throw new AppError('No valid product rows found — check the template and try again', 400);
  }

  const createdProducts = await Product.insertMany(
    validRows.map((row) => ({
      vendorId: req.user.id,
      catalogIds: [],
      name: row.name,
      description: row.description,
      price: row.price,
      taxPercent: row.taxPercent,
      unit: row.unit,
      minimumOrderQuantity: row.minimumOrderQuantity,
      images: row.images,
      video: row.video,
      categoryId: row.categoryId,
      specifications: row.specifications,
    }))
  );

  res.status(201).json({
    success: true,
    message: `${createdProducts.length} product${createdProducts.length === 1 ? '' : 's'} imported successfully`,
    productsCreated: createdProducts.length,
    errors,
    warnings,
  });
});
