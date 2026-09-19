// Shared reference data for the expense engine.

const EXPENSE_CATEGORIES = [
  'Food',
  'Transport',
  'Shopping',
  'Bills',
  'Entertainment',
  'Health',
  'Fitness',
  'Education',
  'Travel',
  'Groceries',
  'Rent',
  'Other',
];

const EXPENSE_SOURCES = ['MANUAL', 'VOICE', 'OCR', 'IMPORT'];

const SPLIT_TYPES = ['EQUAL', 'EXACT', 'PERCENTAGE', 'SHARES'];

// 2300+ fallback rates are impossible to keep accurate offline; this table is
// ONLY used as a last-resort estimate when the live currency API is
// unreachable and no cached rate exists in the database. Every conversion
// still stores its own exchangeRate on the Expense.
const CURRENCIES = {
  INR: { code: 'INR', symbol: '₹', name: 'Indian Rupee', decimals: 2 },
  USD: { code: 'USD', symbol: '$', name: 'US Dollar', decimals: 2 },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro', decimals: 2 },
  GBP: { code: 'GBP', symbol: '£', name: 'British Pound', decimals: 2 },
  AED: { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham', decimals: 2 },
  JPY: { code: 'JPY', symbol: '¥', name: 'Japanese Yen', decimals: 0 },
  CAD: { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', decimals: 2 },
  AUD: { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', decimals: 2 },
  SGD: { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', decimals: 2 },
};

// Approximate cross rates relative to 1 USD (informational fallback only).
// Kept in the same shape the live API returns so callers can't tell the source.
const FALLBACK_RATES_USD = {
  USD: 1,
  INR: 94.5,
  EUR: 0.92,
  GBP: 0.78,
  AED: 3.67,
  JPY: 149,
  CAD: 1.36,
  AUD: 1.51,
  SGD: 1.3,
};

const SUPPORTED_CURRENCIES = Object.keys(CURRENCIES);

// Expense amounts above this (in the user's base currency) require an
// explicit voice confirmation before they are created/executed.
const LARGE_EXPENSE_THRESHOLD = 20000;

// TTL for cached exchange rates (milliseconds).
const CURRENCY_RATE_TTL_MS = 6 * 60 * 60 * 1000;

module.exports = {
  EXPENSE_CATEGORIES,
  EXPENSE_SOURCES,
  SPLIT_TYPES,
  CURRENCIES,
  SUPPORTED_CURRENCIES,
  FALLBACK_RATES_USD,
  LARGE_EXPENSE_THRESHOLD,
  CURRENCY_RATE_TTL_MS,
  DEFAULT_CURRENCY: 'INR',
};