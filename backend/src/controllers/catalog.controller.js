const mongoose = require('mongoose');
const Catalog = require('../models/Catalog');
const Product = require('../models/Product');
const Category = require('../models/Category');
const User = require('../models/User');
const slugify = require('../utils/slugify');
const generateQrCodeDataUrl = require('../utils/qrCode');
const { parseWorkbook } = require('../utils/excelParser');
const { normalizeProductRow } = require('../utils/normalizeProductRow');
const readImagesZip = require('../utils/readImagesZip');
const resolveRowImages = require('../utils/resolveRowImages');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const notImplemented = require('../utils/notImplemented');
const { CATALOG_TEMPLATE_IDS, DEFAULT_CATALOG_TEMPLATE } = require('../utils/catalogTemplates');
const { FREE_CATALOG_LIMIT, FREE_PRODUCT_LIMIT, exceedsFreeProductLimit } = require('../utils/planLimits');
const findOrCreateCategory = require('../utils/findOrCreateCategory');
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
  res.json({ success: true, catalogs: await Promise.all(catalogs.map(toCatalogResponse)) });
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

  const validRows = [];
  const errors = [];
  const warnings = [];
  const categoryCache = new Map();

  // Free tier: rows beyond this position get truncated below regardless,
  // so skip their category lookups and image resolution — no point paying
  // for DB writes / sharp compression on rows that get thrown away.
  const effectiveLimit = user.subscriptionType === 'paid' ? Infinity : FREE_PRODUCT_LIMIT;

  for (let i = 0; i < records.length; i += 1) {
    const rowNumber = i + 2; // +1 for header row, +1 for 1-indexing
    const { data, error } = normalizeProductRow(records[i], fieldMappings);
    if (error) {
      errors.push({ rowNumber, error });
      continue;
    }

    const willBeInserted = validRows.length < effectiveLimit;

    let categoryId;
    if (data.categoryName && willBeInserted) {
      // eslint-disable-next-line no-await-in-loop
      categoryId = await findOrCreateCategory(user._id, data.categoryName, categoryCache);
    }

    // eslint-disable-next-line no-await-in-loop
    const images = willBeInserted ? await resolveRowImages(data, zipEntries, rowNumber, warnings) : data.images;

    validRows.push({ ...data, categoryId, images });
  }

  if (validRows.length === 0) {
    throw new AppError('No valid product rows found — check the column mapping and try again', 400);
  }

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
      description: row.description,
      price: row.price,
      unit: row.unit,
      images: row.images,
      video: row.video || undefined,
      categoryId: row.categoryId,
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
