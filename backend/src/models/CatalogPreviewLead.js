const mongoose = require('mongoose');

// Two ways to land here — same model, same admin panel, tagged by
// `source` so admins can tell them apart:
//  - 'landing_page': the public "Free Catalog Preview" landing page
//    (frontend/pages/catalog-preview.tsx). Anonymous visitor, not tied
//    to a User account; fills in every field themselves.
//  - 'vendor_dashboard': the "We'll Do It For You" card on an already
//    logged-in vendor's dashboard (frontend/components/dashboard/SetupHelpCard.tsx).
//    Only the Excel file is collected — name/email/WhatsApp/industry
//    are filled in from the vendor's own account, hence optional below.
const catalogPreviewLeadSchema = new mongoose.Schema(
  {
    source: { type: String, enum: ['landing_page', 'vendor_dashboard'], default: 'landing_page' },
    // Only set for vendor_dashboard submissions — lets an admin jump
    // straight to the account. Public landing-page submitters usually
    // don't have one yet.
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    whatsappNo: { type: String, required: true, trim: true },
    // Required on the public form (enforced in
    // catalogPreviewLead.validators.js); left optional here since a
    // vendor-dashboard submission doesn't collect either — their
    // industry may already be on file, and product count isn't known
    // until the sheet is actually reviewed.
    industry: { type: String, trim: true },
    numberOfProducts: { type: Number, min: 1 },

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
