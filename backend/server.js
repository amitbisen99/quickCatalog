require('dotenv').config();

const app = require('./src/app');
const connectDB = require('./src/config/db');
const { startAllowedOriginsRefresh } = require('./src/utils/allowedOriginsCache');

const PORT = process.env.PORT || 5000;

(async () => {
  await connectDB();
  startAllowedOriginsRefresh();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`QuickCatalog API listening on port ${PORT}`);
  });
})();
