const mongoose = require('mongoose');

const enquiryItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    // Snapshot of the product at enquiry time — survives the product
    // later being edited, unlinked, or deleted, and is never trusted
    // from the client (re-derived server-side from the live product).
    name: { type: String, required: true },
    sku: { type: String },
    price: { type: Number, required: true },
    unit: { type: String },
    taxPercent: { type: Number },
    quantity: { type: Number, required: true, min: 1, default: 1 },
  },
  { _id: false }
);

const enquirySchema = new mongoose.Schema(
  {
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    catalogId: { type: mongoose.Schema.Types.ObjectId, ref: 'Catalog', required: true, index: true },
    // Snapshot — survives the catalog being renamed or deleted later.
    catalogName: { type: String, required: true },

    customerName: { type: String, required: true, trim: true },
    customerMobile: { type: String, required: true, trim: true },
    customerEmail: { type: String, trim: true },

    items: { type: [enquiryItemSchema], required: true, validate: (v) => v.length > 0 },

    status: { type: String, enum: ['new', 'contacted', 'closed'], default: 'new' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Enquiry', enquirySchema);
