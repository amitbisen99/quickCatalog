const mongoose = require('mongoose');

// Singleton — there's only ever one active price for each region, set by
// the admin. Modeled as a collection (rather than an env var) so it's
// editable from the admin panel without a redeploy.
const planPricingSchema = new mongoose.Schema(
  {
    indiaPriceInr: { type: Number, required: true, default: 999, min: 0 },
    internationalPriceUsd: { type: Number, required: true, default: 19, min: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('PlanPricing', planPricingSchema);
