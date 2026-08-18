const PlanPricing = require('../models/PlanPricing');

// Singleton — always the first (and only) doc, seeded with the model's
// defaults on first read if the admin hasn't set anything yet.
async function getPlanPricing() {
  let pricing = await PlanPricing.findOne();
  if (!pricing) {
    pricing = await PlanPricing.create({});
  }
  return pricing;
}

// The vendor's own display currency (set on the Settings page) is the
// only signal this app has for "are they in India or not" — there's no
// separate country field. INR vendors get the India price; everyone
// else gets the international price in USD.
function resolveVendorPrice(user, pricing) {
  if (user.currency === 'INR') {
    return { amount: pricing.indiaPriceInr, currency: 'INR' };
  }
  return { amount: pricing.internationalPriceUsd, currency: 'USD' };
}

module.exports = { getPlanPricing, resolveVendorPrice };
