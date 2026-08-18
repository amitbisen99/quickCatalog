const mongoose = require('mongoose');

// One row per Razorpay order a vendor starts, not just successful ones —
// keeps an audit trail of abandoned/failed attempts alongside completed
// upgrades, which a single field on User couldn't do.
const paymentSchema = new mongoose.Schema(
  {
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    razorpayOrderId: { type: String, required: true, index: true },
    razorpayPaymentId: { type: String },
    razorpaySignature: { type: String },
    // Smallest currency unit (paise/cents) — what Razorpay itself deals
    // in, kept as-is here rather than converted back to major units so
    // this never has to duplicate that conversion logic.
    amount: { type: Number, required: true },
    currency: { type: String, required: true, enum: ['INR', 'USD'] },
    status: { type: String, enum: ['created', 'paid', 'failed'], default: 'created' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Payment', paymentSchema);
