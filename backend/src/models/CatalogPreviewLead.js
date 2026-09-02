const mongoose = require('mongoose');

// Submitted from the public "Free Catalog Preview" landing page
// (frontend/pages/catalog-preview.tsx) — an anonymous visitor sends
// their product Excel and contact details, our team manually builds a
// preview catalog and reaches out on WhatsApp. Not tied to a User
// account; most submitters don't have one yet.
const catalogPreviewLeadSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    whatsappNo: { type: String, required: true, trim: true },
    industry: { type: String, required: true, trim: true },
    numberOfProducts: { type: Number, required: true, min: 1 },

    excelFileName: { type: String, required: true },
    // Base64 data URL — same storage pattern as Product.images rather
    // than disk storage, so the whole lead is one self-contained
    // document an admin can view/download without a separate file store.
    excelFileData: { type: String, required: true },

    status: { type: String, enum: ['new', 'contacted', 'delivered', 'closed'], default: 'new' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('CatalogPreviewLead', catalogPreviewLeadSchema);
