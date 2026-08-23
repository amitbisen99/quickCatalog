const mongoose = require('mongoose');

const catalogSchema = new mongoose.Schema(
  {
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    qrCode: {
      type: String, // data:image/png;base64,... — see utils/qrCode.js
    },
    // Which public-page layout renders this catalog. Validated against
    // CATALOG_TEMPLATE_IDS (utils/catalogTemplates.js) at the API layer —
    // kept as a plain string here rather than a schema enum so adding a
    // new template doesn't require a migration.
    template: {
      type: String,
      default: 'modern-grid',
    },
    // White-label domains — kept as two independent pairs (not one shared
    // domain/status) because a catalog can have both a branded subdomain
    // AND a fully custom domain active at once, each going through its own
    // separate manual hPanel setup with its own timeline. `sparse: true`
    // lets many catalogs share `null` here without violating uniqueness.
    subdomain: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
    },
    // 'pending' the moment a vendor requests it; flipped to 'active' once
    // an admin has actually set it up in hPanel + DNS (see docs/ARCHITECTURE
    // or the admin domain-requests screen) and it's confirmed resolving —
    // there's no automated provisioning API on this host, so this is a
    // manually-actioned queue, not a live status check.
    subdomainStatus: {
      type: String,
      enum: ['pending', 'active', 'failed'],
    },
    customDomain: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
    },
    customDomainStatus: {
      type: String,
      enum: ['pending', 'active', 'failed'],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Catalog', catalogSchema);
