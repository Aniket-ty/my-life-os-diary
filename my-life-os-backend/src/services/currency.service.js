// Currency conversion service.
// Single place that talks to any exchange-rate API. Rates are cached in the
// `currency_rates` table (with a TTL) so calls are minimised. If the API is
// unreachable and no fresh cache exists, a documented static fallback table is
// used so the app never hard-crashes on a currency query.
//
// The API key never reaches the frontend: this service only runs server-side.

const prisma = require('../config/database');
const { toMinor, mulByRate, toNumber, formatMinor } = require('../utils/money');
const {
  CURRENCIES,
  SUPPORTED_CURRENCIES,
  FALLBACK_RATES_USD,
  CURRENCY_RATE_TTL_MS,
  DEFAULT_CURRENCY,
} = require('../utils/constants');

const API_BASE = (process.env.CURRENCY_API_URL || 'https://open.er-api.com/v6/latest').replace(/\/+$/, '');

/** Human-friendly identity of a currency code. */
function currencyInfo(code) {
  return CURRENCIES[code] || { code, symbol: '', name: code, decimals: 2 };
}

function validateCurrency(code) {
  const upper = String(code || '').toUpperCase();
  if (!SUPPORTED_CURRENCIES.includes(upper)) {
    throw new Error(`Unsupported currency: ${code}`);
  }
  return upper;
}

/**
 * Fetch a live rate from the configured API. Returns null on any failure so
 * callers can fall back without crashing.
 */
async function fetchLiveRate(from, to) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(`${API_BASE}/${encodeURIComponent(from)}`, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' },
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const json = await res.json();
    const rates = json?.rates;
    if (!rates || typeof rates[to] !== 'number') return null;
    return { rate: String(rates[to]), source: 'api', fetchedAt: new Date() };
  } catch {
    return null;
  }
}

/** Static estimate rate (documented fallback) — used only when the API + cache are unavailable. */
function fallbackRate(from, to) {
  if (from === to) return '1';
  const base = FALLBACK_RATES_USD[from];
  const target = FALLBACK_RATES_USD[to];
  if (base == null || target == null) return null;
  return String(Number(target) / Number(base));
}

/**
 * Get an exchange rate for from -> to (how much of `to` per 1 `from`).
 * Priority: fresh cache → live API → static fallback.
 */
async function getRate(from, to) {
  from = validateCurrency(from);
  to = validateCurrency(to);
  if (from === to) return { rate: '1', source: 'identity', fetchedAt: new Date(), fresh: true };

  const [cached, cachedReverse] = await Promise.all([
    prisma.currencyRate.findUnique({ where: { baseCurrency_targetCurrency: { baseCurrency: from, targetCurrency: to } } }),
    prisma.currencyRate.findUnique({ where: { baseCurrency_targetCurrency: { baseCurrency: to, targetCurrency: from } } }),
  ]);

  const now = Date.now();

  // Use the direct cache if fresh.
  if (cached && now - cached.fetchedAt.getTime() < CURRENCY_RATE_TTL_MS) {
    return { rate: cached.rate.toString(), source: 'cache', fetchedAt: cached.fetchedAt, fresh: true };
  }
  // Use the inverted cache if fresh (rate = 1 / cached).
  if (cachedReverse && now - cachedReverse.fetchedAt.getTime() < CURRENCY_RATE_TTL_MS) {
    return { rate: formatRate(1 / Number(cachedReverse.rate)), source: 'cache', fetchedAt: cachedReverse.fetchedAt, fresh: true };
  }

  const live = await fetchLiveRate(from, to);
  if (live && live.rate !== '1') {
    await prisma.currencyRate.upsert({
      where: { baseCurrency_targetCurrency: { baseCurrency: from, targetCurrency: to } },
      update: { rate: live.rate, source: live.source, fetchedAt: new Date() },
      create: { baseCurrency: from, targetCurrency: to, rate: live.rate, source: live.source, fetchedAt: new Date() },
    });
    return { rate: live.rate, source: 'api', fetchedAt: new Date(), fresh: true };
  }

  // Stale cache is still better than a guess — use it if present.
  if (cached) return { rate: cached.rate.toString(), source: 'cache', fetchedAt: cached.fetchedAt, fresh: false };
  if (cachedReverse) return { rate: formatRate(1 / Number(cachedReverse.rate)), source: 'cache', fetchedAt: cachedReverse.fetchedAt, fresh: false };

  const fb = fallbackRate(from, to);
  if (fb) return { rate: fb, source: 'fallback', fetchedAt: new Date(), fresh: false };
  throw new Error(`No exchange rate available for ${from} → ${to}`);
}

function formatRate(value) {
  return value.toFixed(8);
}

/**
 * Convert an amount between currencies.
 * @returns {{ amount:number, originalAmount:number, currency:string, baseAmount:number, baseCurrency:string, exchangeRate:string, rateSource:string }}
 */
async function convertAmount(amount, from, to) {
  const base = validateCurrency(from || DEFAULT_CURRENCY);
  const target = validateCurrency(to || DEFAULT_CURRENCY);
  const { rate, source } = await getRate(base, target);
  const amountMinor = toMinor(amount);
  const convertedMinor = mulByRate(amountMinor, rate);
  return {
    amount: toNumber(amountMinor),
    originalAmount: toNumber(amountMinor),
    currency: base,
    baseAmount: toNumber(convertedMinor),
    baseCurrency: target,
    exchangeRate: String(rate),
    rateSource: source,
  };
}

/** All supported currencies with metadata (safe for the frontend). */
function listCurrencies() {
  return SUPPORTED_CURRENCIES.map((code) => currencyInfo(code));
}

/** Ensure an expense's baseAmount is correct (used in create/update flows). */
async function normaliseToBase(amount, from, to) {
  const rate = await getRate(from, to);
  return {
    amount: toNumber(toMinor(amount)),
    baseAmount: toNumber(mulByRate(toMinor(amount), rate.rate)),
    exchangeRate: String(rate.rate),
    rateSource: rate.source,
  };
}

module.exports = {
  currencyInfo,
  validateCurrency,
  getRate,
  convertAmount,
  normaliseToBase,
  listCurrencies,
  fallbackRate,
  formatMinor,
};