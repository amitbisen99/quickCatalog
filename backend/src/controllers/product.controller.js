const mongoose = require('mongoose');
const XLSX = require('xlsx');
const Product = require('../models/Product');
const Catalog = require('../models/Catalog');
const Category = require('../models/Category');
const Specification = require('../models/Specification');
const User = require('../models/User');
const { compressImageToDataUrl } = require('../utils/imageProcessor');
const { parseWorkbook } = require('../utils/excelParser');
const { normalizeProductRow } = require('../utils/normalizeProductRow');
const { HEADERS: BULK_HEADERS } = require('../utils/normalizeBulkProductRow');

// bulkImportSample's downloadable template is keyed by these exact
// column names (BULK_HEADERS uses `name`; normalizeProductRow's
// fieldMappings expects `productName` — everything else lines up) —
// used as the fallback mapping in bulkImportProducts when the caller
// doesn't send its own (a direct API call with no mapping step).
const BULK_HEADERS_AS_MAPPING = { ...BULK_HEADERS, productName: BULK_HEADERS.name };
const findOrCreateCategory = require('../utils/findOrCreateCategory');
const findOrCreateSpecification = require('../utils/findOrCreateSpecification');
const readImagesZip = require('../utils/readImagesZip');
const resolveRowImages = require('../utils/resolveRowImages');
const mapWithConcurrency = require('../utils/mapWithConcurrency');
const generateUniqueProductSlug = require('../utils/generateUniqueProductSlug');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { FREE_PRODUCT_LIMIT, exceedsFreeProductLimit } = require('../utils/planLimits');

// Per-row image compression (sharp resize+recompress) is the slow part
// of a bulk import — processing rows one at a time in a single request
// scales linearly and can run long enough to hit a proxy/platform
// timeout on larger files. This bounds how many rows compress their
// images at once: enough to meaningfully cut wall-clock time without
// decoding too many full-resolution images into memory simultaneously
// (each decoded bitmap is far bigger than its compressed source file —
// this is the main lever against OOM crashes on a memory-constrained
// production instance, now that readImagesZip no longer decompresses
// the whole ZIP up front either).
const IMAGE_RESOLVE_CONCURRENCY = 3;

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
    // Vendor-wide, not per-catalog — a free vendor only ever has one
    // catalog anyway, and this count also gets reused by
    // createStandaloneProduct so library-only products count toward the
    // same cap instead of being a free loophole around it.
    needsCapCheck ? Product.countDocuments({ vendorId }) : null,
  ]);

  if (!catalog) {
    throw new AppError('Catalog not found', 404);
  }

  if (needsCapCheck) assertWithinProductLimit(user, existingCount, additionalCount);

  return catalog;
}

function assertWithinProductLimit(user, existingCount, additionalCount) {
  if (exceedsFreeProductLimit(user, existingCount, additionalCount)) {
    throw new AppError(`Free plan is limited to ${FREE_PRODUCT_LIMIT} products. Upgrade to add more.`, 403);
  }
}

// The "how much room does this vendor have left" query pair, shared by
// every place that needs to check/enforce the product cap outside of
// requireOwnedCatalog (which already fetches these two alongside its own
// catalog lookup, so it stays a plain Promise.all there).
function getVendorProductCapacity(vendorId) {
  return Promise.all([
    User.findById(vendorId).select('subscriptionType'),
    Product.countDocuments({ vendorId }),
  ]);
}

function toProductResponse(product) {
  return {
    id: product._id,
    vendorId: product.vendorId,
    catalogIds: product.catalogIds,
    name: product.name,
    sku: product.sku,
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
    const regex = new RegExp(escaped, 'i');
    // Matches either field — a vendor searching "ABC123" is as likely to
    // be typing a SKU as a product name.
    filter.$or = [{ name: regex }, { sku: regex }];
  }
  return filter;
}

// SKU is optional, but when one is given it should actually identify a
// single product — same check-before-write, case-insensitive uniqueness
// check category/specification names already use, scoped per vendor
// rather than a schema-level unique index.
async function assertSkuAvailable(vendorId, sku, excludeProductId) {
  if (!sku || !sku.trim()) return;
  const escaped = sku.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const query = { vendorId, sku: new RegExp(`^${escaped}$`, 'i') };
  if (excludeProductId) query._id = { $ne: excludeProductId };
  const existing = await Product.findOne(query);
  if (existing) {
    throw new AppError('A product with this SKU already exists', 409);
  }
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

  const { name, sku, description, price, unit, minimumOrderQuantity, categoryId, video, taxPercent } = req.body;
  await assertSkuAvailable(req.user.id, sku);
  const images = (await Promise.all((req.files || []).map((f) => compressImageToDataUrl(f.buffer)))).slice(0, 3);
  const specifications = parseSpecifications(req);
  const slug = await generateUniqueProductSlug(req.user.id, name);

  const product = await Product.create({
    vendorId: req.user.id,
    catalogIds: [catalogId],
    name,
    slug,
    sku: sku || undefined,
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

// Adds an existing (already-owned) product to another catalog. No
// capacity check here — this attaches an already-existing Product document
// to one more catalog (`$addToSet` on catalogIds below), it doesn't create
// a new one, so it never changes the vendor's total product count the
// free-tier cap is actually measuring. Free vendors can freely link any of
// their existing products across as many of their catalogs as they like;
// only creating brand-new products (createProduct, bulkImportProducts)
// counts against the cap.
exports.linkExistingProduct = asyncHandler(async (req, res) => {
  const { catalogId, productId } = req.params;
  await requireOwnedCatalog(catalogId, req.user.id);

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
  const { name, sku, description, price, unit, minimumOrderQuantity, categoryId, video, taxPercent } = req.body;
  await assertSkuAvailable(req.user.id, sku);

  // Not tied to a catalog, so requireOwnedCatalog's cap check never runs
  // for this path — enforce the same vendor-wide free-tier product limit
  // here directly, or a free vendor could bypass it entirely by adding
  // products to their library instead of a catalog.
  const [user, existingCount] = await getVendorProductCapacity(req.user.id);
  assertWithinProductLimit(user, existingCount, 1);

  const images = (await Promise.all((req.files || []).map((f) => compressImageToDataUrl(f.buffer)))).slice(0, 3);
  const specifications = parseSpecifications(req);
  const slug = await generateUniqueProductSlug(req.user.id, name);

  const product = await Product.create({
    vendorId: req.user.id,
    catalogIds: [],
    name,
    slug,
    sku: sku || undefined,
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

  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.max(parseInt(req.query.limit, 10) || PAGE_SIZE, 1);

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

  const { name, sku, description, price, unit, minimumOrderQuantity, categoryId, video, taxPercent } = req.body;
  // Skip the lookup entirely when the SKU isn't actually changing — the
  // common "edit other fields" path shouldn't pay for a uniqueness query
  // against itself.
  if (sku && sku !== product.sku) {
    await assertSkuAvailable(req.user.id, sku, productId);
  }

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
  product.sku = sku || undefined;
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

// Bulk price update — one MongoDB round-trip via bulkWrite instead of N
// separate document saves. Takes exact {productId, price} pairs rather
// than a "+10%" style instruction: the frontend already has every
// selected product's current price loaded (it rendered the list), so it
// computes and previews the new values itself, and this just writes
// exactly what the vendor confirmed — no risk of the frontend's preview
// and the backend's math disagreeing on rounding.
exports.bulkUpdatePrice = asyncHandler(async (req, res) => {
  const { updates } = req.body;

  const result = await Product.bulkWrite(
    updates.map(({ productId, price }) => ({
      updateOne: {
        // vendorId in the filter, not just _id — a productId for another
        // vendor's product simply matches nothing rather than updating it.
        filter: { _id: productId, vendorId: req.user.id },
        update: { $set: { price } },
      },
    }))
  );

  res.json({
    success: true,
    message: `Updated price on ${result.modifiedCount} of ${updates.length} product(s)`,
    matched: result.matchedCount,
    modified: result.modifiedCount,
  });
});

// Bulk category reassignment (or clear, when categoryId is omitted) for
// a set of the vendor's own products. $unset rather than $set: null so
// "no category" stays genuinely absent from the document, matching how
// a single product's categoryId is treated everywhere else.
exports.bulkUpdateCategory = asyncHandler(async (req, res) => {
  const { productIds, categoryId } = req.body;

  const result = await Product.updateMany(
    { _id: { $in: productIds }, vendorId: req.user.id },
    categoryId ? { $set: { categoryId } } : { $unset: { categoryId: '' } }
  );

  res.json({
    success: true,
    message: `Updated category on ${result.modifiedCount} of ${productIds.length} product(s)`,
    matched: result.matchedCount,
    modified: result.modifiedCount,
  });
});

// Sample .xlsx template for bulk product import — a starting point, not a
// strict requirement, since bulkImportProducts below now maps columns by
// name the same way the catalog-from-file wizard does. Includes a
// second "Reference" tab listing the vendor's existing category and
// specification names, so they can be copied into a row exactly instead
// of retyped (typos would otherwise silently create duplicates).
exports.bulkImportSample = asyncHandler(async (req, res) => {
  const headers = Object.values(BULK_HEADERS);
  const examples = [
    [
      'Cotton T-Shirt',
      'TSHIRT-RED-L',
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
      'MUG-350ML',
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
// yet — link them to catalogs afterward) from an Excel file — any column
// names, via fieldMappings (same wizard flow as catalog.controller.js's
// createFromFile: /upload/parse-catalog to read headers, fuzzy-matched
// client-side, previewed, then submitted here) — plus an optional ZIP of
// product photos.
exports.bulkImportProducts = asyncHandler(async (req, res) => {
  const excelFile = req.files?.file?.[0];
  if (!excelFile) {
    throw new AppError('No file uploaded', 400);
  }

  // Optional — falls back to the fixed template's own header names so a
  // direct API call (or an older client) without a mapping step still
  // works. The wizard always sends this, resolved client-side from
  // /upload/parse-catalog's headers via the same fuzzy matching the
  // catalog-from-file wizard uses, so a vendor's own column names (not
  // just the exact template headers) are accepted here too.
  let fieldMappings;
  try {
    fieldMappings = req.body.fieldMappings ? JSON.parse(req.body.fieldMappings) : BULK_HEADERS_AS_MAPPING;
  } catch (err) {
    throw new AppError('Invalid field mappings', 400);
  }
  if (!fieldMappings.productName || !fieldMappings.price) {
    throw new AppError('Product Name and Price must be mapped', 400);
  }

  const { records } = parseWorkbook(excelFile.buffer);
  if (records.length === 0) {
    throw new AppError('No product rows found in this file', 400);
  }

  const zipFile = req.files?.imagesZip?.[0];
  const zipEntries = zipFile ? readImagesZip(zipFile.buffer) : null;

  const [user, existingCount] = await getVendorProductCapacity(req.user.id);
  // Free tier: cap this import at whatever's left of the vendor's overall
  // product limit, not the full FREE_PRODUCT_LIMIT again — importing
  // shouldn't reset the ceiling for a vendor who already has products.
  const remainingSlots =
    user.subscriptionType === 'paid' ? Infinity : Math.max(FREE_PRODUCT_LIMIT - existingCount, 0);

  const pending = [];
  const errors = [];
  const warnings = [];
  const categoryCache = new Map();
  const specCache = new Map();
  const usedSlugs = new Set();

  // Category/spec lookups share a name->id cache and check-then-create —
  // running two rows with the same brand-new name concurrently could
  // both miss the cache and create a duplicate, so this part stays
  // sequential. It's cheap either way; image compression below (resolved
  // in its own concurrent pass) is what actually made large imports slow.
  // Rows beyond remainingSlots get truncated below regardless, so skip
  // both of those for them — no point paying for work that's thrown away.
  for (let i = 0; i < records.length; i += 1) {
    const rowNumber = i + 2; // +1 for header row, +1 for 1-indexing
    const { data, error } = normalizeProductRow(records[i], fieldMappings);
    if (error) {
      errors.push({ rowNumber, error });
      continue;
    }

    const willBeInserted = pending.length < remainingSlots;

    let categoryId;
    if (data.categoryName && willBeInserted) {
      // eslint-disable-next-line no-await-in-loop
      categoryId = await findOrCreateCategory(req.user.id, data.categoryName, categoryCache);
    }

    // Keeps the vendor's Specification master list in sync — the value
    // itself is stored on the product keyed by name, not by this id.
    if (willBeInserted) {
      const specNames = Object.keys(data.specifications);
      for (let s = 0; s < specNames.length; s += 1) {
        // eslint-disable-next-line no-await-in-loop
        await findOrCreateSpecification(req.user.id, specNames[s], specCache);
      }
    }

    const slug = willBeInserted
      ? // eslint-disable-next-line no-await-in-loop
        await generateUniqueProductSlug(req.user.id, data.name, usedSlugs)
      : undefined;

    pending.push({ rowNumber, data, categoryId, slug, willBeInserted });
  }

  if (pending.length === 0) {
    throw new AppError('No valid product rows found — check the template and try again', 400);
  }

  const validRows = await mapWithConcurrency(pending, IMAGE_RESOLVE_CONCURRENCY, async (row) => ({
    ...row.data,
    categoryId: row.categoryId,
    slug: row.slug,
    images: row.willBeInserted
      ? await resolveRowImages(row.data, zipEntries, row.rowNumber, warnings)
      : row.data.images,
  }));

  // Free tier: cap the import rather than reject it outright — the vendor
  // still gets whatever fits under the limit, and can upgrade to bring
  // the rest in. slice(0, Infinity) is a no-op for paid.
  const rowsToInsert = validRows.slice(0, remainingSlots);
  const isCapped = user.subscriptionType !== 'paid' && validRows.length > remainingSlots;

  const createdProducts = await Product.insertMany(
    rowsToInsert.map((row) => ({
      vendorId: req.user.id,
      catalogIds: [],
      name: row.name,
      slug: row.slug,
      sku: row.sku,
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

  const planLimit = isCapped
    ? { limit: FREE_PRODUCT_LIMIT, totalValidRows: validRows.length, imported: createdProducts.length }
    : null;

  res.status(201).json({
    success: true,
    message: `${createdProducts.length} product${createdProducts.length === 1 ? '' : 's'} imported successfully`,
    productsCreated: createdProducts.length,
    errors,
    warnings,
    planLimit,
  });
});
