const mongoose = require('mongoose');
const Catalog = require('../models/Catalog');
const Product = require('../models/Product');
const Category = require('../models/Category');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { parseDataUrl } = require('../utils/dataUrl');

function toPublicProductResponse(product) {
  return {
    id: product._id,
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
  };
}

function toPublicCatalogResponse(catalog) {
  return {
    id: catalog._id,
    name: catalog.name,
    description: catalog.description,
    slug: catalog.slug,
    template: catalog.template,
  };
}

// Only vendor fields safe to expose to anonymous visitors — no email.
function toPublicVendorResponse(vendor) {
  return {
    businessName: vendor ? vendor.businessName : undefined,
    logo: vendor ? vendor.logo : undefined,
    banner: vendor ? vendor.banner : undefined,
    mobileNo: vendor ? vendor.mobileNo : undefined,
    currency: vendor ? vendor.currency : undefined,
  };
}

async function findCategoriesForProducts(products) {
  const categoryIds = [...new Set(products.map((p) => p.categoryId).filter(Boolean).map(String))];
  const categories = categoryIds.length ? await Category.find({ _id: { $in: categoryIds } }) : [];
  return categories.map((c) => ({ id: c._id, name: c.name }));
}

// No auth — anonymous visitors reach this via a shared link or QR scan.
exports.getCatalogBySlug = asyncHandler(async (req, res) => {
  const { catalogSlug } = req.params;
  const catalog = await Catalog.findOne({ slug: catalogSlug.toLowerCase() });
  if (!catalog) {
    throw new AppError('Catalog not found', 404);
  }

  const [vendor, products] = await Promise.all([
    User.findById(catalog.vendorId),
    Product.find({ catalogIds: catalog._id }).sort({ createdAt: -1 }),
  ]);

  res.json({
    success: true,
    catalog: toPublicCatalogResponse(catalog),
    vendor: toPublicVendorResponse(vendor),
    categories: await findCategoriesForProducts(products),
    products: products.map(toPublicProductResponse),
  });
});

// The product detail page's data source — same public/no-auth access as
// the catalog listing, scoped to one product so the detail page doesn't
// have to fetch the whole catalog just to show one item.
exports.getCatalogProductBySlug = asyncHandler(async (req, res) => {
  const { catalogSlug, productId } = req.params;
  const catalog = await Catalog.findOne({ slug: catalogSlug.toLowerCase() });
  if (!catalog) {
    throw new AppError('Catalog not found', 404);
  }
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    throw new AppError('Product not found', 404);
  }

  const product = await Product.findOne({ _id: productId, catalogIds: catalog._id });
  if (!product) {
    throw new AppError('Product not found', 404);
  }

  const vendor = await User.findById(catalog.vendorId);

  res.json({
    success: true,
    catalog: toPublicCatalogResponse(catalog),
    vendor: toPublicVendorResponse(vendor),
    categories: await findCategoriesForProducts([product]),
    product: toPublicProductResponse(product),
  });
});

// The vendor's banner/logo is stored as an inline base64 data URL (see
// compressImageToDataUrl) — fine for an <img src> the browser renders
// directly, but useless as an og:image value, since link-preview
// crawlers (WhatsApp, Facebook, etc.) fetch that URL over plain HTTP and
// don't resolve data: URIs. This decodes it back to real image bytes and
// serves them as an actual resource so it can be linked from a <meta>
// tag. Prefers the banner (wider, hero-shaped) over the logo.
exports.getCatalogOgImage = asyncHandler(async (req, res) => {
  const { catalogSlug } = req.params;
  const catalog = await Catalog.findOne({ slug: catalogSlug.toLowerCase() });
  if (!catalog) {
    throw new AppError('Catalog not found', 404);
  }

  const vendor = await User.findById(catalog.vendorId).select('banner logo');
  const parsed = parseDataUrl(vendor?.banner) || parseDataUrl(vendor?.logo);
  if (!parsed) {
    throw new AppError('No share image available', 404);
  }

  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.setHeader('Content-Type', parsed.mimeType);
  res.send(parsed.buffer);
});

// White-label routing — the frontend's middleware.ts calls this only for
// a vendor domain's root path (no /public/... in the URL) and for
// internal routes it needs to redirect away from, to find out which
// catalog the domain's owner wants shown by default. Every other public
// catalog URL (/public/{slug}, deep links and all) already resolves
// purely from the slug in the path, regardless of hostname — no lookup
// needed there at all.
//
// Only ever matches an *active* domain — a 'pending' one isn't actually
// resolving via real DNS yet (hasn't been set up in hPanel), so treating
// it as live here would be a lie the middleware can't act on anyway.
exports.resolveDomain = asyncHandler(async (req, res) => {
  const host = String(req.query.host || '').toLowerCase().trim();
  if (!host) {
    throw new AppError('host is required', 400);
  }

  const baseDomain = process.env.APP_BASE_DOMAIN;
  let vendor = null;

  if (baseDomain && host.endsWith(`.${baseDomain}`)) {
    const subdomain = host.slice(0, -(`.${baseDomain}`.length));
    vendor = await User.findOne({ subdomain, subdomainStatus: 'active' }, 'primaryCatalogId');
  }

  if (!vendor) {
    vendor = await User.findOne({ customDomain: host, customDomainStatus: 'active' }, 'primaryCatalogId');
  }

  if (!vendor) {
    throw new AppError('No vendor found for this domain', 404);
  }

  // Falls back to the vendor's oldest catalog when no primary is chosen
  // (or the chosen one no longer exists) — covers the common single-
  // catalog free-plan vendor without requiring them to pick one.
  let catalog = null;
  if (vendor.primaryCatalogId) {
    catalog = await Catalog.findOne({ _id: vendor.primaryCatalogId, vendorId: vendor._id }, 'slug');
  }
  if (!catalog) {
    catalog = await Catalog.findOne({ vendorId: vendor._id }, 'slug').sort({ createdAt: 1 });
  }

  if (!catalog) {
    throw new AppError('This vendor has no catalogs yet', 404);
  }

  res.json({ success: true, slug: catalog.slug });
});

// Enquiry submission lives at POST /api/catalogs/:catalogId/enquiries
// (catalog.routes.js → enquiry.controller.js) since it needs the
// catalog's real id, not just its slug.

// Visit tracking + the vendor-facing analytics read live under
// /api/analytics (analytics.routes.js → analytics.controller.js) — this
// used to have a second, unused stub here too; removed to avoid two
// competing "analytics" surfaces.
