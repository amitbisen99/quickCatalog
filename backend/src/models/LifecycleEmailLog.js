const mongoose = require('mongoose');

// One row per (vendor, slug) once that lifecycle email has actually been
// sent — the send job's idempotency check: a slot is only ever sent once
// per vendor, no matter how many times the recurring check re-evaluates
// them (see utils/lifecycleEmails.js). Also doubles as a simple send
// history if that's ever useful from the admin side later.
const lifecycleEmailLogSchema = new mongoose.Schema(
  {
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    slug: { type: String, required: true },
    sentAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

lifecycleEmailLogSchema.index({ vendorId: 1, slug: 1 }, { unique: true });

module.exports = mongoose.model('LifecycleEmailLog', lifecycleEmailLogSchema);
