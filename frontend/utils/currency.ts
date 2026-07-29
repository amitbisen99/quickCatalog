// Keep CODES in sync with backend/src/utils/currencies.js — that's what
// actually validates the value the vendor picks; this list just adds the
// symbol/label needed to render it.
export const CURRENCIES: { code: string; symbol: string; label: string }[] = [
  { code: 'INR', symbol: '₹', label: 'Indian Rupee (₹)' },
  { code: 'USD', symbol: '$', label: 'US Dollar ($)' },
  { code: 'EUR', symbol: '€', label: 'Euro (€)' },
  { code: 'GBP', symbol: '£', label: 'British Pound (£)' },
  { code: 'AED', symbol: 'AED', label: 'UAE Dirham (AED)' },
  { code: 'SAR', symbol: 'SAR', label: 'Saudi Riyal (SAR)' },
  { code: 'SGD', symbol: 'S$', label: 'Singapore Dollar (S$)' },
  { code: 'AUD', symbol: 'A$', label: 'Australian Dollar (A$)' },
  { code: 'CAD', symbol: 'C$', label: 'Canadian Dollar (C$)' },
  { code: 'JPY', symbol: '¥', label: 'Japanese Yen (¥)' },
  { code: 'CNY', symbol: '¥', label: 'Chinese Yuan (¥)' },
  { code: 'CHF', symbol: 'CHF', label: 'Swiss Franc (CHF)' },
  { code: 'ZAR', symbol: 'R', label: 'South African Rand (R)' },
  { code: 'NZD', symbol: 'NZ$', label: 'New Zealand Dollar (NZ$)' },
  { code: 'HKD', symbol: 'HK$', label: 'Hong Kong Dollar (HK$)' },
];

const DEFAULT_SYMBOL = '₹';

export function currencySymbol(code?: string): string {
  return CURRENCIES.find((c) => c.code === code)?.symbol || DEFAULT_SYMBOL;
}
