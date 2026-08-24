// Default dial code assumed for vendors who signed up before country-code
// selection existed (see backfillUserCountryCode.js) and as the User
// model's own schema default. Country-code *format* is validated with a
// plain `/^\+\d{1,4}$/` regex (see auth.validators.js / user.validators.js)
// rather than an allowlist — enumerating every valid dial code here would
// just be a second copy of frontend/utils/countries.ts to keep in sync,
// for no real benefit over the format check.
const DEFAULT_COUNTRY_CODE = '+91';

module.exports = { DEFAULT_COUNTRY_CODE };
