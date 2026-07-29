// Single source of truth for which currency codes are valid. The
// frontend's display list (frontend/utils/currency.ts) must stay in
// sync — codes here are what's accepted by the API, symbols/labels for
// the picker live only on the frontend since the backend never renders
// price strings itself.
const CURRENCY_CODES = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SAR', 'SGD', 'AUD', 'CAD', 'JPY', 'CNY', 'CHF', 'ZAR', 'NZD', 'HKD'];

const DEFAULT_CURRENCY = 'INR';

module.exports = { CURRENCY_CODES, DEFAULT_CURRENCY };
