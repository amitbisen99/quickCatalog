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
  },
  { timestamps: true }
);

module.exports = mongoose.model('Catalog', catalogSchema);
