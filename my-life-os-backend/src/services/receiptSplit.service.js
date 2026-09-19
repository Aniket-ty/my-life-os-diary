// Item-level receipt splitting and tax/tip allocation engine.
// All financial arithmetic is performed in BigInt minor units to guarantee
// conservation of money.

const { toMinor, toNumber, add, sub, divMinor, equalSplit } = require('../utils/money');

/**
 * Calculate member shares based on item assignments + tax/tip allocation.
 *
 * @param {object} params
 * @param {Array<{name: string, amount: number|string, assignedUserIds: string[]}>} params.items
 * @param {number|string} params.subtotal
 * @param {number|string} params.tax
 * @param {number|string} params.tip
 * @param {number|string} params.total
 * @param {'proportional'|'equal'} [params.taxAllocation='proportional']
 * @param {string[]} params.allMemberIds
 * @returns {{ memberShares: Record<string, { itemSubtotal: number, taxShare: number, tipShare: number, total: number }>, totalCalculated: number }}
 */
function calculateItemSplits({
  items,
  subtotal,
  tax = 0,
  tip = 0,
  total,
  taxAllocation = 'proportional',
  allMemberIds = [],
}) {
  const memberIds = new Set(allMemberIds);
  // Collect all assigned user IDs
  for (const item of items) {
    for (const uid of item.assignedUserIds || []) {
      memberIds.add(uid);
    }
  }

  const ids = Array.from(memberIds);
  if (ids.length === 0) {
    throw new Error('At least one member must be assigned to split the bill');
  }

  const memberItemSubtotal = new Map(ids.map((id) => [id, 0n]));

  // 1. Calculate each member's item subtotal
  for (const item of items) {
    const itemTotal = toMinor(item.amount);
    const assigned = (item.assignedUserIds || []).filter((id) => ids.includes(id));
    if (assigned.length === 0) {
      throw new Error(`Item "${item.name}" must be assigned to at least one person`);
    }

    const itemParts = equalSplit(itemTotal, assigned.length);
    assigned.forEach((uid, idx) => {
      memberItemSubtotal.set(uid, add(memberItemSubtotal.get(uid), itemParts[idx]));
    });
  }

  const totalItemMinor = Array.from(memberItemSubtotal.values()).reduce((a, b) => a + b, 0n);

  const taxMinor = toMinor(tax || 0);
  const tipMinor = toMinor(tip || 0);
  const extraMinor = taxMinor + tipMinor;

  const memberTax = new Map(ids.map((id) => [id, 0n]));
  const memberTip = new Map(ids.map((id) => [id, 0n]));

  if (taxAllocation === 'equal' || totalItemMinor === 0n) {
    // Equal distribution among all involved members
    const taxParts = equalSplit(taxMinor, ids.length);
    const tipParts = equalSplit(tipMinor, ids.length);
    ids.forEach((uid, idx) => {
      memberTax.set(uid, taxParts[idx]);
      memberTip.set(uid, tipParts[idx]);
    });
  } else {
    // Proportional to item spending
    let allocatedTax = 0n;
    let allocatedTip = 0n;
    const partsTax = [];
    const partsTip = [];

    for (let i = 0; i < ids.length; i++) {
      const uid = ids[i];
      const userSub = memberItemSubtotal.get(uid);
      const userTax = (userSub * taxMinor) / totalItemMinor;
      const userTip = (userSub * tipMinor) / totalItemMinor;
      allocatedTax += userTax;
      allocatedTip += userTip;
      partsTax.push(userTax);
      partsTip.push(userTip);
    }

    // Remainder redistribution
    let remTax = taxMinor - allocatedTax;
    let remTip = tipMinor - allocatedTip;
    let idx = ids.length - 1;
    while (remTax > 0n && idx >= 0) {
      partsTax[idx] += 1n;
      remTax -= 1n;
      idx--;
    }
    idx = ids.length - 1;
    while (remTip > 0n && idx >= 0) {
      partsTip[idx] += 1n;
      remTip -= 1n;
      idx--;
    }

    ids.forEach((uid, i) => {
      memberTax.set(uid, partsTax[i]);
      memberTip.set(uid, partsTip[i]);
    });
  }

  const memberShares = {};
  let totalCalcMinor = 0n;

  for (const uid of ids) {
    const itemSub = memberItemSubtotal.get(uid);
    const userTax = memberTax.get(uid);
    const userTip = memberTip.get(uid);
    const userTotal = itemSub + userTax + userTip;
    totalCalcMinor += userTotal;

    memberShares[uid] = {
      itemSubtotal: toNumber(itemSub),
      taxShare: toNumber(userTax),
      tipShare: toNumber(userTip),
      total: toNumber(userTotal),
    };
  }

  return {
    memberShares,
    totalCalculated: toNumber(totalCalcMinor),
    sumCheck: totalCalcMinor === (totalItemMinor + extraMinor),
  };
}

module.exports = { calculateItemSplits };
