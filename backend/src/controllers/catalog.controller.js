const mongoose = require('mongoose');
const XLSX = require('xlsx');
const Catalog = require('../models/Catalog');
const Product = require('../models/Product');
const Category = require('../models/Category');
const Specification = require('../models/Specification');
const User = require('../models/User');
const slugify = require('../utils/slugify');
const generateQrCodeDataUrl = require('../utils/qrCode');
const { parseWorkbook } = require('../utils/excelParser');
const { normalizeProductRow } = require('../utils/normalizeProductRow');
const readImagesZip = require('../utils/readImagesZip');
const resolveRowImages = require('../utils/resolveRowImages');
const mapWithConcurrency = require('../utils/mapWithConcurrency');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const notImplemented = require('../utils/notImplemented');
const { CATALOG_TEMPLATE_IDS, DEFAULT_CATALOG_TEMPLATE } = require('../utils/catalogTemplates');
const { FREE_CATALOG_LIMIT, FREE_PRODUCT_LIMIT, exceedsFreeProductLimit } = require('../utils/planLimits');
const findOrCreateCategory = require('../utils/findOrCreateCategory');
const findOrCreateSpecification = require('../utils/findOrCreateSpecification');

// See product.controller.js's identical constant — per-row image
// compression is the slow part of an import; this bounds how many rows
// compress concurrently instead of doing all of them at once (risking an
// OOM crash decoding too many full-resolution images simultaneously) or
// one at a time (risking a proxy/platform timeout on larger files).
const IMAGE_RESOLVE_CONCURRENCY = 3;
const generateCatalogPdf = require('../utils/generateCatalogPdf');

// knownCount lets a caller that just inserted the products (and so already
// knows the exact count) skip the extra countDocuments round-trip.
async function toCatalogResponse(catalog, knownCount) {
  const productsCount = knownCount !== undefined ? knownCount : await Product.countDocuments({ catalogIds: catalog._id });
  return {
    id: catalog._id,
    name: catalog.name,
    description: catalog.description,
    slug: catalog.slug,
    qrCode: catalog.qrCode,
    template: catalog.template,
    productsCount,
    createdAt: catalog.createdAt,
    updatedAt: catalog.updatedAt,
  };
}

async function generateUniqueSlug(name) {
  const base = slugify(name);
  let slug = base;
  let suffix = 1;
  // eslint-disable-next-line no-await-in-loop
  while (await Catalog.findOne({ slug })) {
    suffix += 1;
    slug = `${base}-${suffix}`;
  }
  return slug;
}

/** Shared by createCatalog and createFromFile — limit check + slug + QR. */
async function createCatalogRecord(user, name, description, template) {
  if (user.subscriptionType !== 'paid') {
    const existingCount = await Catalog.countDocuments({ vendorId: user._id });
    if (existingCount >= FREE_CATALOG_LIMIT) {
      throw new AppError(
        `Free plan is limited to ${FREE_CATALOG_LIMIT} catalog. Upgrade to create more.`,
        403
      );
    }
  }

  if (template !== undefined && !CATALOG_TEMPLATE_IDS.includes(template)) {
    throw new AppError('Invalid template', 400);
  }

  const slug = await generateUniqueSlug(name);
  const qrCode = await generateQrCodeDataUrl(`${process.env.CLIENT_URL}/public/${slug}`);

  return Catalog.create({
    vendorId: user._id,
    name,
    description,
    slug,
    qrCode,
    template: template || DEFAULT_CATALOG_TEMPLATE,
  });
}

exports.getCatalogs = asyncHandler(async (req, res) => {
  const catalogs = await Catalog.find({ vendorId: req.user.id }).sort({ createdAt: -1 });
  // NOT `catalogs.map(toCatalogResponse)` — Array.map passes (element,
  // index, array) to its callback, so the index would land in
  // toCatalogResponse's `knownCount` param and show as the products count
  // (0, 1, 2, ...) instead of each catalog's real product count.
  res.json({ success: true, catalogs: await Promise.all(catalogs.map((catalog) => toCatalogResponse(catalog))) });
});

exports.createCatalog = asyncHandler(async (req, res) => {
  const { name, description, template } = req.body;
  const user = await User.findById(req.user.id);

  const catalog = await createCatalogRecord(user, name, description, template);

  res.status(201).json({
    success: true,
    message: 'Catalog created successfully',
    catalog: await toCatalogResponse(catalog),
  });
});

exports.getCatalogById = asyncHandler(async (req, res) => {
  const { catalogId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(catalogId)) {
    throw new AppError('Catalog not found', 404);
  }

  const catalog = await Catalog.findOne({ _id: catalogId, vendorId: req.user.id });
  if (!catalog) {
    throw new AppError('Catalog not found', 404);
  }

  res.json({ success: true, catalog: await toCatalogResponse(catalog) });
});

exports.updateCatalog = asyncHandler(async (req, res) => {
  const { catalogId } = req.params;
  const { name, description, template } = req.body;
  if (!mongoose.Types.ObjectId.isValid(catalogId)) {
    throw new AppError('Catalog not found', 404);
  }

  const catalog = await Catalog.findOne({ _id: catalogId, vendorId: req.user.id });
  if (!catalog) {
    throw new AppError('Catalog not found', 404);
  }

  // Partial update — the name/description form and the template picker
  // each PUT only the fields they own, so only touch what was sent.
  if (name !== undefined) catalog.name = name;
  if (description !== undefined) catalog.description = description;
  if (template !== undefined) {
    if (!CATALOG_TEMPLATE_IDS.includes(template)) {
      throw new AppError('Invalid template', 400);
    }
    catalog.template = template;
  }
  await catalog.save();

  res.json({ success: true, message: 'Catalog updated successfully', catalog: await toCatalogResponse(catalog) });
});

exports.deleteCatalog = asyncHandler(async (req, res) => {
  const { catalogId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(catalogId)) {
    throw new AppError('Catalog not found', 404);
  }

  const catalog = await Catalog.findOneAndDelete({ _id: catalogId, vendorId: req.user.id });
  if (!catalog) {
    throw new AppError('Catalog not found', 404);
  }

  // Products are shared across catalogs — unlink rather than delete, since
  // the same product may still be used elsewhere.
  await Product.updateMany({ catalogIds: catalog._id }, { $pull: { catalogIds: catalog._id } });
  // Enquiries are deliberately left alone — they're a record of a real
  // customer contact (name/mobile/email + a snapshot of what they asked
  // about), not catalog data. Deleting the catalog shouldn't erase that.

  res.json({ success: true, message: 'Catalog deleted successfully' });
});

exports.createFromFile = asyncHandler(async (req, res) => {
  const excelFile = req.files?.file?.[0];
  if (!excelFile) {
    throw new AppError('No file uploaded', 400);
  }

  const { catalogName, catalogDescription } = req.body;
  if (!catalogName || !catalogName.trim()) {
    throw new AppError('Catalog name is required', 400);
  }
  if (catalogDescription && catalogDescription.length > 200) {
    throw new AppError('Catalog description must be 200 characters or less', 400);
  }

  let fieldMappings;
  try {
    fieldMappings = JSON.parse(req.body.fieldMappings || '{}');
  } catch (err) {
    throw new AppError('Invalid field mappings', 400);
  }
  if (!fieldMappings.productName || !fieldMappings.price) {
    throw new AppError('Product Name and Price must be mapped', 400);
  }

  const user = await User.findById(req.user.id);
  const { records } = parseWorkbook(excelFile.buffer);
  if (records.length === 0) {
    throw new AppError('No product rows found in this file', 400);
  }

  const zipFile = req.files?.imagesZip?.[0];
  const zipEntries = zipFile ? readImagesZip(zipFile.buffer) : null;

  const pending = [];
  const errors = [];
  const warnings = [];
  const categoryCache = new Map();
  const specCache = new Map();

  // Free tier: rows beyond this position get truncated below regardless,
  // so skip their category lookups (and, in the image-resolution pass
  // below, their sharp compression) — no point paying for either on rows
  // that get thrown away.
  const effectiveLimit = user.subscriptionType === 'paid' ? Infinity : FREE_PRODUCT_LIMIT;

  // Category/spec lookups share a name->id cache and check-then-create,
  // so they — and the truncation position itself, which depends on how
  // many valid rows came before each one — have to stay sequential.
  // Image compression is resolved afterward in its own concurrent pass:
  // it's independent per row and was the actual bottleneck on larger
  // imports (one row's images fully compressing before the next row even
  // started could add up to more wall-clock time than a request has
  // before a proxy/platform timeout kicks in).
  for (let i = 0; i < records.length; i += 1) {
    const rowNumber = i + 2; // +1 for header row, +1 for 1-indexing
    const { data, error } = normalizeProductRow(records[i], fieldMappings);
    if (error) {
      errors.push({ rowNumber, error });
      continue;
    }

    const willBeInserted = pending.length < effectiveLimit;

    let categoryId;
    if (data.categoryName && willBeInserted) {
      // eslint-disable-next-line no-await-in-loop
      categoryId = await findOrCreateCategory(user._id, data.categoryName, categoryCache);
    }

    // Keeps the vendor's Specification master list in sync — the value
    // itself is stored on the product keyed by name, not by this id.
    if (willBeInserted) {
      const specNames = Object.keys(data.specifications);
      for (let s = 0; s < specNames.length; s += 1) {
        // eslint-disable-next-line no-await-in-loop
        await findOrCreateSpecification(user._id, specNames[s], specCache);
      }
    }

    pending.push({ rowNumber, data, categoryId, willBeInserted });
  }

  if (pending.length === 0) {
    throw new AppError('No valid product rows found — check the column mapping and try again', 400);
  }

  const validRows = await mapWithConcurrency(pending, IMAGE_RESOLVE_CONCURRENCY, async (row) => ({
    ...row.data,
    categoryId: row.categoryId,
    images: row.willBeInserted
      ? await resolveRowImages(row.data, zipEntries, row.rowNumber, warnings)
      : row.data.images,
  }));

  // Free tier: cap products per catalog rather than reject the whole
  // import — the vendor still gets a usable catalog, just capped, and can
  // upgrade to bring the rest in. slice(0, Infinity) is a no-op for paid.
  const rowsToInsert = validRows.slice(0, effectiveLimit);
  const isCapped = exceedsFreeProductLimit(user, 0, validRows.length);

  const catalog = await createCatalogRecord(user, catalogName, catalogDescription);

  const createdProducts = await Product.insertMany(
    rowsToInsert.map((row) => ({
      vendorId: user._id,
      catalogIds: [catalog._id],
      name: row.name,
      sku: row.sku,
      description: row.description,
      price: row.price,
      unit: row.unit,
      images: row.images,
      video: row.video || undefined,
      categoryId: row.categoryId,
      specifications: row.specifications,
    }))
  );

  const planLimit = isCapped
    ? { limit: FREE_PRODUCT_LIMIT, totalValidRows: validRows.length, imported: createdProducts.length }
    : null;

  res.status(201).json({
    success: true,
    message: `Catalog created with ${createdProducts.length} product${createdProducts.length === 1 ? '' : 's'}`,
    catalog: await toCatalogResponse(catalog, createdProducts.length),
    productsCreated: createdProducts.length,
    errors,
    warnings,
    planLimit,
  });
});

// Sample template for the create-catalog wizard's Upload step — mirrors
// products.controller.js's bulkImportSample, but only the columns this
// wizard's own field-mapping actually reads (no Minimum Order Quantity /
// Tax %, which belong to the separate product bulk-import flow and would
// otherwise go silently unused here).
exports.getCreateFromFileSample = asyncHandler(async (req, res) => {
  const headers = ['Product Name', 'SKU', 'Price', 'Description', 'Category', 'Unit', 'Specifications', 'Image URL', 'Image Filename', 'Video URL'];
  const examples = [
    ['Cotton T-Shirt', 'TSHIRT-RED-L', 499, 'Premium cotton round-neck t-shirt', 'Apparel', 'pcs', 'Color: Red; Size: Large', 'https://example.com/image1.jpg', '', ''],
    ['Ceramic Mug', 'MUG-350ML', 149, 'Matte-finish 350ml mug', 'Home & Kitchen', 'pcs', 'Material: Ceramic', '', 'mug1.jpg', ''],
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
  res.setHeader('Content-Disposition', 'attachment; filename="create-catalog-sample.xlsx"');
  res.send(buffer);
});

exports.getCatalogStats = notImplemented('GET /api/catalogs/:catalogId/stats');

exports.downloadCatalogPdf = asyncHandler(async (req, res) => {
  const { catalogId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(catalogId)) {
    throw new AppError('Catalog not found', 404);
  }

  const catalog = await Catalog.findOne({ _id: catalogId, vendorId: req.user.id });
  if (!catalog) {
    throw new AppError('Catalog not found', 404);
  }

  const [vendor, products] = await Promise.all([
    User.findById(req.user.id),
    Product.find({ catalogIds: catalog._id }).sort({ createdAt: -1 }),
  ]);

  const categoryIds = [...new Set(products.map((p) => p.categoryId).filter(Boolean).map(String))];
  const categories = categoryIds.length ? await Category.find({ _id: { $in: categoryIds } }) : [];

  const pdfDoc = await generateCatalogPdf({
    catalog,
    vendor,
    categories: categories.map((c) => ({ id: c._id, name: c.name })),
    products: products.map((p) => ({
      name: p.name,
      price: p.price,
      taxPercent: p.taxPercent,
      unit: p.unit,
      minimumOrderQuantity: p.minimumOrderQuantity,
      images: p.images,
      categoryId: p.categoryId,
      specifications: Object.fromEntries(p.specifications || new Map()),
    })),
  });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${slugify(catalog.name)}.pdf"`);
  pdfDoc.pipe(res);
});
