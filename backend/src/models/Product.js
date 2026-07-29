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

module.exports = mongoose.model('Product', productSchema);
