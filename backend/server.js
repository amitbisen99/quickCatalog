require('dotenv').config();

const app = require('./src/app');
const connectDB = require('./src/config/db');
const { startAllowedOriginsRefresh } = require('./src/utils/allowedOriginsCache');
const backfillProductSlugs = require('./src/utils/backfillProductSlugs');
const backfillUserCountryCode = require('./src/utils/backfillUserCountryCode');

const PORT = process.env.PORT || 5000;

(async () => {
  await connectDB();
  // Awaited before the app starts serving traffic — public product URLs
  // now depend on every product having a slug, so this has to finish
  // before any request can be served, not run alongside them.
  await backfillProductSlugs();
  await backfillUserCountryCode();
  startAllowedOriginsRefresh();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Instant Catalog API listening on port ${PORT}`);
  });
})();
