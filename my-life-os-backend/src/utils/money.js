// Integer (minor-unit) money arithmetic.
// All financial calculations are done on BigInt minor units (paise / cents)
// so rounding is consistent and floating-point drift can never leak into
// stored amounts. Values are rounded half-up at 2 decimal places.

const SCALE = 100n; // 2 decimal places

function roundedMinor(int, frac) {
  // int = integer part string, frac = fraction part with at least 3 digits
  const value1000 = BigInt(int || '0') * 1000n + BigInt(frac); // value * 1000
  const v = value1000 / 10n; // round(value * 100)
  const rem = value1000 % 10n;
  return rem >= 5n ? v + 1n : v;
}

function parseDecimalString(str) {
  const trimmed = String(str).trim();
  if (trimmed === '' || trimmed === '.') return 0n;
  const negative = trimmed.startsWith('-');
  const clean = trimmed.replace(/[^0-9.]/g, '');
  const [intPart, fracPart = ''] = clean.split('.');
  const frac = fracPart.slice(0, 3).padEnd(3, '0');
  const result = roundedMinor(intPart, frac);
  return negative ? -result : result;
}

/** Parse a number / numeric string into minor units (BigInt). Rounds half-up. */
function toMinor(value) {
  if (typeof value === 'bigint') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('Invalid numeric amount');
    return parseDecimalString(value.toFixed(3));
  }
  return parseDecimalString(String(value));
}

/** Format minor units back into a decimal string with exactly `decimals` places. */
function formatMinor(value, decimals = 2) {
  const neg = value < 0n;
  const abs = neg ? -value : value;
  const pow = 10n ** BigInt(decimals);
  const int = abs / pow;
  const frac = (abs % pow).toString().padStart(decimals, '0');
  return `${neg ? '-' : ''}${int.toString()}.${frac}`;
}

/** Convert minor units to a JavaScript number (for display/serialization). */
function toNumber(value) {
  return Number(formatMinor(typeof value === 'bigint' ? value : toMinor(value)));
}

function add(a, b) { return toMinor(a) + toMinor(b); }
function sub(a, b) { return toMinor(a) - toMinor(b); }

/**
 * Multiply a minor-unit value by a rate that may itself have decimals.
 * Example: mulByRate(10000n, "104.50") === 1_045_000n (₹100.00 × 104.50).
 */
function mulByRate(minor, rate) {
  minor = toMinor(minor);
  const rateStr = String(rate).trim();
  const negative = rateStr.startsWith('-');
  const clean = rateStr.replace(/[^0-9.]/g, '');
  const [intPart, fracPart = ''] = clean.split('.');
  const frac = fracPart.slice(0, 8).padEnd(8, '0');
  const rateScaled = BigInt(intPart || '0') * 100000000n + BigInt(frac);
  const product = minor * rateScaled;
  const quotient = product / 100000000n;
  const remainder = product % 100000000n;
  let rounded = quotient;
  if (remainder * 2n >= 100000000n) rounded += 1n;
  return negative ? -rounded : rounded;
}

/** Divide a minor-unit value by a count, rounding half-up. */
function divMinor(minor, by) {
  minor = toMinor(minor);
  const n = BigInt(by);
  if (n === 0n) throw new Error('Cannot divide by zero');
  const neg = minor < 0n;
  const abs = neg ? -minor : minor;
  const q = abs / n;
  const r = abs % n;
  const result = r * 2n >= n ? q + 1n : q;
  return neg ? -result : result;
}

/**
 * Distribute a minor-unit total across `count` shares equally, ensuring the
 * parts sum exactly to the total. Remainder paise go to the later members,
 * matching the documented behaviour (₹100 / 3 → 33.33, 33.33, 33.34).
 */
function equalSplit(total, count) {
  total = toMinor(total);
  count = Number(count);
  if (count <= 0) return [];
  const base = divMinor(total, count);
  const parts = new Array(count).fill(base);
  let remainder = total - base * BigInt(count);
  let idx = count - 1;
  while (remainder > 0n && idx >= 0) {
    parts[idx] += 1n;
    remainder -= 1n;
    idx -= 1;
  }
  return parts;
}

module.exports = {
  SCALE,
  toMinor,
  formatMinor,
  toNumber,
  add,
  sub,
  mulByRate,
  divMinor,
  equalSplit,
};