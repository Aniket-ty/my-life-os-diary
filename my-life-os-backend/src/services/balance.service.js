// Balance engine.
// Balances are NEVER persisted or hard-coded: they are derived on demand from
// the expense history + splits + settlements, so edits/deletes/settlement
// reversals always recalculate correctly.
//
// net(user) = amountPaidOnExpenses
//           − settlementsReceived
//           − amountOwedOnSplits
//           + settlementsPaid
//
// The sum of net across all members is always zero.

const { toMinor, toNumber, add, sub } = require('../utils/money');

/**
 * @param {object} params
 * @param {Array<{id:string, paidById:string|null, amount:string|number, splits:Array<{userId:string, amount:string|number}>}>} params.expenses
 * @param {Array<{fromUserId:string, toUserId:string, amount:string|number}>} params.settlements
 * @param {Array<{id:string, name:string}>} params.members
 */
function calculateGroupBalances({ expenses, settlements, members }) {
  const memberMap = new Map(members.map((m) => [m.id, m]));
  const ids = members.map((m) => m.id);

  const paid = new Map(ids.map((id) => [id, 0n]));
  const owed = new Map(ids.map((id) => [id, 0n]));
  const settlesReceived = new Map(ids.map((id) => [id, 0n]));
  const settlesPaid = new Map(ids.map((id) => [id, 0n]));

  // debt[debtorId][payerId] = amount debtor owes payer (net of settlements)
  const debt = new Map(ids.map((id) => [id, new Map()]));
  const edge = (debtorId, payerId) => {
    if (!debt.has(debtorId)) debt.set(debtorId, new Map());
    const m = debt.get(debtorId);
    if (!m.has(payerId)) m.set(payerId, 0n);
    return m;
  };

  for (const expense of expenses) {
    const payer = expense.paidById;
    const total = toMinor(expense.amount ?? expense.baseAmount ?? 0);
    if (payer && memberMap.has(payer)) {
      paid.set(payer, add(paid.get(payer), total));
    }
    for (const split of expense.splits || []) {
      const debtor = split.userId;
      const amount = toMinor(split.amount);
      owed.set(debtor, add(owed.get(debtor) || 0n, amount));
      if (payer && debtor !== payer && memberMap.has(debtor)) {
        const m = edge(debtor, payer);
        m.set(payer, add(m.get(payer), amount));
      }
    }
  }

  for (const settlement of settlements) {
    const { fromUserId, toUserId } = settlement;
    const amount = toMinor(settlement.amount);
    if (!memberMap.has(fromUserId) || !memberMap.has(toUserId)) continue;
    settlesPaid.set(fromUserId, add(settlesPaid.get(fromUserId), amount));
    settlesReceived.set(toUserId, add(settlesReceived.get(toUserId), amount));
    const m = edge(fromUserId, toUserId);
    m.set(toUserId, sub(m.get(toUserId), amount));
  }

  const memberRows = members.map((member) => {
    const id = member.id;
    const net = sub(
      add(paid.get(id), settlesPaid.get(id)),
      add(owed.get(id), settlesReceived.get(id)),
    );
    return {
      userId: id,
      name: member.name || id.slice(0, 6),
      paid: toNumber(paid.get(id)),
      owed: toNumber(owed.get(id)),
      net: toNumber(net),
    };
  });

  // Outstanding "who owes whom" derived from expenses + settlements.
  const debts = [];
  for (const [debtor, edges] of debt) {
    for (const [payer, amount] of edges) {
      if (amount > 0n) {
        const debtorName = memberMap.get(debtor)?.name || debtor;
        const payerName = memberMap.get(payer)?.name || payer;
        debts.push({
          fromUserId: debtor,
          fromName: debtorName,
          toUserId: payer,
          toName: payerName,
          amount: toNumber(amount),
        });
      }
    }
  }

  return {
    members: memberRows,
    debts,
    simplified: suggestSettlements(memberRows),
    totalPaid: toNumber(Array.from(paid.values()).reduce((a, b) => add(a, b), 0n)),
  };
}

/**
 * Greedy balance-simplification: produces a minimal set of suggested
 * settlement transfers to clear all net balances.
 */
function suggestSettlements(memberRows) {
  const creditors = memberRows
    .filter((m) => m.net > 0)
    .map((m) => ({ id: m.userId, name: m.name, amount: toMinor(m.net) }))
    .sort((a, b) => (a.amount < b.amount ? 1 : -1));

  const debtors = memberRows
    .filter((m) => m.net < 0)
    .map((m) => ({ id: m.userId, name: m.name, amount: -toMinor(m.net) }))
    .sort((a, b) => (a.amount < b.amount ? 1 : -1));

  const result = [];
  let ci = 0;
  let di = 0;
  while (ci < creditors.length && di < debtors.length) {
    const credit = creditors[ci];
    const debit = debtors[di];
    const amount = debit.amount <= credit.amount ? debit.amount : credit.amount;
    if (amount > 0n) {
      result.push({
        fromUserId: debit.id,
        fromName: debit.name,
        toUserId: credit.id,
        toName: credit.name,
        amount: toNumber(amount),
      });
    }
    credit.amount = sub(credit.amount, amount);
    debit.amount = sub(debit.amount, amount);
    if (credit.amount === 0n) ci += 1;
    if (debit.amount === 0n) di += 1;
  }
  return result;
}

/**
 * How much `me` owes `other` / is owed by `other` (net of settlements).
 * @returns {{ owesMe:number, iOwe:number, net:number }}
 */
function pairwiseBalance({ expenses, settlements, meId, otherId }) {
  let owedToOther = 0n; // me -> other
  let otherOwesMe = 0n; // other -> me

  for (const expense of expenses) {
    for (const split of expense.splits || []) {
      if (expense.paidById === meId && split.userId === otherId) {
        otherOwesMe = add(otherOwesMe, toMinor(split.amount));
      } else if (expense.paidById === otherId && split.userId === meId) {
        owedToOther = add(owedToOther, toMinor(split.amount));
      }
    }
  }
  for (const settlement of settlements) {
    if (settlement.fromUserId === meId && settlement.toUserId === otherId) {
      owedToOther = sub(owedToOther, toMinor(settlement.amount));
    } else if (settlement.fromUserId === otherId && settlement.toUserId === meId) {
      otherOwesMe = sub(otherOwesMe, toMinor(settlement.amount));
    }
  }

  const net = sub(owedToOther, otherOwesMe); // >0 => I owe other
  return {
    owesMe: toNumber(net < 0n ? -net : 0n),
    iOwe: toNumber(net > 0n ? net : 0n),
    net: toNumber(net),
  };
}

module.exports = { calculateGroupBalances, suggestSettlements, pairwiseBalance };