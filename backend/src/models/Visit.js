const mongoose = require('mongoose');

// One row per page load on a public catalog — either the catalog's own
// page (productId null) or a specific product being opened (productId
// set). Analytics reads aggregate over these rather than incrementing
// counters on Catalog/Product directly, so the full history (trend over
// time, device split, per-product breakdown) stays queryable instead of
// collapsing into a single running total.
const visitSchema = new mongoose.Schema(
  {
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    catalogId: { type: mongoose.Schema.Types.ObjectId, ref: 'Catalog', required: true, index: true },
    // null = a catalog-level page view; set = that specific product was opened.
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', default: null },
    // A random id the public page generates and keeps in localStorage —
    // deliberately not a cookie. This project already hit real problems
    // with third-party cookies on mobile Safari/installed-PWA sessions
    // (see the PWA session-persistence fix); a visitor id only needs to
    // be stable for one browser's repeat visits, not readable
    // server-side or resistant to being cleared.
    visitorId: { type: String, required: true },
    device: { type: String, enum: ['mobile', 'desktop'], default: 'desktop' },
  },
  { timestamps: true }
);

// Every analytics query scopes by catalogId first, then narrows by date
// range or by productId (null vs set) on top of that.
visitSchema.index({ catalogId: 1, createdAt: -1 });
visitSchema.index({ catalogId: 1, productId: 1 });

module.exports = mongoose.model('Visit', visitSchema);
