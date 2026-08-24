const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    // A product belongs to the vendor, not to any one catalog — the same
    // product can be reused across multiple catalogs (e.g. a "Retail"
    // and a "Wholesale" catalog sharing most of the same items).
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    catalogIds: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: 'Catalog',
      default: [],
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    // SEO-friendly URL segment for the public product-detail page
    // (/public/{catalogSlug}/products/{slug}) — generated once from the
    // name at creation time and never regenerated on a later name edit,
    // same stability convention as Catalog's own slug. Unique per vendor
    // (not globally — two different vendors' "T-Shirt" shouldn't collide
    // with each other), enforced via the compound index below rather
    // than a schema-level unique:true, which would be global.
    slug: {
      type: String,
      lowercase: true,
      trim: true,
    },
    // Optional — a vendor may not use SKUs at all. Uniqueness (when one is
    // given) is enforced app-side, scoped per vendor, the same
    // check-before-write pattern category/specification names already use
    // rather than a schema-level unique index.
    sku: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    unit: {
      type: String,
      trim: true,
      default: 'pcs',
    },
    // Percentage tax applied on top of price, e.g. 5 for 5% GST.
    // Undefined/0 means no tax note is shown for this product.
    taxPercent: {
      type: Number,
      min: 0,
      max: 100,
    },
    minimumOrderQuantity: {
      type: Number,
      min: 1,
      default: 1,
    },
    images: {
      type: [String],
      default: [],
    },
    video: {
      type: String,
      trim: true,
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
    },
    // Product-level spec values, e.g. { Size: 'Large', Color: 'Red' }.
    // Keys come from the vendor's Specification master (Prompt 12).
    specifications: {
      type: Map,
      of: String,
      default: {},
    },
  },
  { timestamps: true }
);

// Every catalog-scoped product listing (public catalog page, PDF
// download, dashboard product list, add-existing-product picker) filters
// on catalogIds and sorts by createdAt — without an index covering both,
// Mongo falls back to an in-memory sort of the FULL matching document set
// (including every product's embedded base64 image data) before applying
// any skip/limit, which blows its 32MB in-memory sort limit for a
// large/image-heavy catalog (confirmed in production: "Sort exceeded
// memory limit... did not opt in to external sorting" on a 200-product
// catalog). This compound index lets Mongo satisfy both the filter and
// the sort straight from the index, so it never needs to. Also replaces
// the old standalone index on catalogIds — its leading field covers that
// case too, so keeping both would just be redundant index maintenance.
productSchema.index({ catalogIds: 1, createdAt: -1 });

// Enforces slug uniqueness per vendor (not globally) — sparse so products
// mid-migration (see the startup backfill in server.js) without a slug
// yet don't collide with each other on `null`.
productSchema.index({ vendorId: 1, slug: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Product', productSchema);
