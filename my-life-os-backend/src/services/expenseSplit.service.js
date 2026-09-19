// Expense split engine.
// Pure functions: (total, splitType, members) -> validated split allocations.
// All math is done in minor units (BigInt) so the parts always sum to the total.
// The sum of splits MUST equal the expense total — enforced here.

const { toMinor, toNumber, formatMinor, divMinor, equalSplit, SCALE } = require('../utils/money');

/**
 * @typedef SplitInput { userId: string, amount?: number|string, percentage?: number, shares?: number|string }
 * @param {string|number} total expense total
 * @param {'EQUAL'|'EXACT'|'PERCENTAGE'|'SHARES'} splitType
 * @param {SplitInput[]} members
 * @returns {{ userId, amountMinor, percentage, shares }[]}
 */
function buildSplits(total, splitType, members) {
  const totalMinor = toMinor(total);
  if (totalMinor <= 0n) throw new Error('amount must be greater than zero');
  if (!Array.isArray(members) || members.length === 0) {
    throw new Error('split members are required');
  }

  switch (splitType) {
    case 'EQUAL': {
      const parts = equalSplit(totalMinor, members.length);
      return members.map((m, i) => ({
        userId: m.userId,
        amountMinor: parts[i],
        percentage: roundPct(members.length ? totalMinor === 0n ? 0 : null : null),
        shares: null,
      }));
    }
    case 'EXACT': {
      const allocated = members.reduce((sum, m) => sum + (toMinor(m.amount) ?? 0n), 0n);
      if (allocated !== totalMinor) {
        throw new Error(`Exact split amounts must add up to the total (₹${toNumber(totalMinor)})`);
      }
      return members.map((m) => ({
        userId: m.userId,
        amountMinor: toMinor(m.amount),
        percentage: null,
        shares: null,
      }));
    }
    case 'PERCENTAGE': {
      const TOTAL_PCT = 10000n; // 100.00 in pct*100
      const sumPct = members.reduce((s, m) => s + toPct(m.percentage), 0n);
      if (sumPct !== TOTAL_PCT) {
        throw new Error('Percentages must add up to 100');
      }
      return allocateProportional(totalMinor, members, 'percentage', toPct);
    }
    case 'SHARES': {
      const shares = members.map((m) => toShares(m.shares));
      if (shares.some((s) => s <= 0n)) throw new Error('Shares must be greater than zero');
      const totalShares = shares.reduce((a, b) => a + b, 0n);
      return allocateShares(totalMinor, members, shares, totalShares);
    }
    default:
      throw new Error(`Unsupported split type: ${splitType}`);
  }
}

function toPct(value) {
  if (value == null) return 0n;
  const v = typeof value === 'number' ? String(value) : String(value);
  const [int, frac = ''] = v.split('.');
  return BigInt(int || '0') * 100n + BigInt(frac.padEnd(2, '0').slice(0, 2));
}

function toShares(value) {
  if (value == null) return 0n;
  return toMinor(value);
}

function roundPct(/* unused */) {
  return null; // percentages are not persisted for EQUAL splits
}

/**
 * Allocate a total proportionally to weights (percentage or shares).
 * Uses round-half-up per part then deposits the rounding remainder so the
 * sum is exact.
 */
function allocateProportional(totalMinor, members, key, weightFn) {
  const weights = members.map((m) => weightFn(m[key]));
  const totalWeight = weights.reduce((a, b) => a + b, 0n);
  return allocateShares(totalMinor, members, weights, totalWeight);
}

function allocateShares(totalMinor, members, weights, totalWeight) {
  const parts = new Array(members.length).fill(0n);
  const numerators = weights.map((w) => totalMinor * w);
  let allocated = 0n;
  for (let i = 0; i < members.length; i += 1) {
    parts[i] = numerators[i] / totalWeight;
    allocated += parts[i];
  }
  // Distribute the rounding remainder 1 minor-unit at a time, starting from
  // the last member (₹1000 × 40/30/30 → 400.00, 300.00, 300.00).
  let remainder = totalMinor - allocated;
  let idx = members.length - 1;
  while (remainder > 0n && idx >= 0) {
    parts[idx] += 1n;
    remainder -= 1n;
    idx -= 1;
  }
  while (remainder < 0n && idx >= 0) {
    parts[idx] -= 1n;
    remainder += 1n;
    idx -= 1;
  }
  return members.map((m, i) => ({
    userId: m.userId,
    amountMinor: parts[i],
    percentage: null,
    shares: m.shares != null ? m.shares : null,
  }));
}

/** Validate + normalise split input coming from an API request. */
function normaliseSplitRequest(total, splitType, members) {
  const validated = members.map((m) => {
    if (!m.userId) throw new Error('Each split member needs a userId');
    return { userId: m.userId, amount: m.amount, percentage: m.percentage, shares: m.shares };
  });
  return buildSplits(total, splitType, validated).map((s) => ({
    userId: s.userId,
    amount: toNumber(s.amountMinor), // 2dp number for JSON
  }));
}

module.exports = { buildSplits, normaliseSplitRequest, toPct, toShares };
module.exports._internal = { formatMinor };