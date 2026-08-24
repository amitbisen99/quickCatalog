const User = require('../models/User');
const { DEFAULT_COUNTRY_CODE } = require('./countryCode');

// Self-healing startup migration, same pattern as backfillProductSlugs —
// there's no shell access to production MongoDB on this host, so vendors
// who registered before the country-code picker existed get one filled
// in automatically the next time the API boots, rather than needing a
// one-off manual script run against production.
async function backfillUserCountryCode() {
  const result = await User.updateMany(
    { countryCode: { $exists: false } },
    { $set: { countryCode: DEFAULT_COUNTRY_CODE } }
  );
  if (result.modifiedCount > 0) {
    console.log(`Backfilled countryCode for ${result.modifiedCount} user(s).`);
  }
}

module.exports = backfillUserCountryCode;
