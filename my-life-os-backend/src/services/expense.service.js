// Shared expense write logic. Used by the expense controller AND the voice
// executor so business rules live in exactly one place.
// Node is the only authority for database writes.

const prisma = require('../config/database');
const { toMinor, toNumber } = require('../utils/money');
const { buildSplits, normaliseSplitRequest } = require('./expenseSplit.service');
const { normaliseToBase, validateCurrency } = require('./currency.service');
const { EXPENSE_CATEGORIES, EXPENSE_SOURCES, DEFAULT_CURRENCY } = require('../utils/constants');
const { toISODate } = require('../utils/dates');

function round(x) { return Math.round(x * 100) / 100; }

/** Validate a general expense payload and compute base amounts + splits. */
async function prepareExpenseData(userId, payload, { forVoice = false } = {}) {
  const amount = toNumber(toMinor(payload.amount));
  if (!(amount > 0)) throw new Error('amount must be greater than zero');

  const currency = validateCurrency(payload.currency || (payload.baseCurrency) || DEFAULT_CURRENCY);
  const baseCurrency = validateCurrency(payload.baseCurrency || (await defaultCurrencyOf(userId)));
  const title = payload.title || payload.description || 'Expense';
  const category = EXPENSE_CATEGORIES.includes(payload.category) ? payload.category : 'Other';
  const expenseDate = new Date(payload.expenseDate || new Date());
  if (Number.isNaN(expenseDate.getTime())) throw new Error('expenseDate is invalid');

  const { baseAmount, exchangeRate } = currency === baseCurrency
    ? { baseAmount: amount, exchangeRate: '1' }
    : await normaliseToBase(amount, currency, baseCurrency);

  const isGroup = Boolean(payload.groupId);
  const group = isGroup
    ? await prisma.expenseGroup.findUnique({ where: { id: payload.groupId }, include: { members: true } })
    : null;
  if (isGroup && !group) throw new Error('Group not found');

  const members = group ? group.members : [];
  const memberIds = new Set(members.map((m) => m.userId));

  const paidById = payload.paidById || userId;
  if (isGroup && !memberIds.has(paidById)) throw new Error('Payer must be a group member');
  if (!isGroup && paidById !== userId) throw new Error('Only you can pay your personal expenses');

  // Build the split allocations.
  let splits;
  if (isGroup) {
    const provided = Array.isArray(payload.splits) ? payload.splits : [];
    const allMembers = provided.length > 0 ? provided : members.map((m) => ({ userId: m.userId }));
    for (const s of allMembers) {
      if (!memberIds.has(s.userId)) throw new Error(`User is not a group member: ${s.userId}`);
    }
    const splitType = payload.splitType || 'EQUAL';
    splits = buildSplits(amount, splitType, allMembers).map((s) => ({
      userId: s.userId,
      amount: toNumber(s.amountMinor),
      percentage: s.percentage != null ? round(Number(s.percentage)) / 100 : null,
      shares: s.shares,
    }));
  } else {
    splits = [{ userId: paidById, amount, percentage: null, shares: null }];
  }

  // Sum equality is guaranteed by expenseSplit.service.buildSplits, but verify defensively.
  const splitSum = toMinor(splits.reduce((a, s) => a + s.amount, 0));
  if (splitSum !== toMinor(amount)) throw new Error('Splits do not add up to the expense total');

  return {
    amount,
    originalAmount: amount,
    currency,
    baseAmount: toNumber(toMinor(baseAmount)),
    baseCurrency,
    exchangeRate,
    category,
    expenseDate: toISODate(expenseDate),
    paidById,
    splits,
  };
}

async function defaultCurrencyOf(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { defaultCurrency: true } });
  return user?.defaultCurrency || DEFAULT_CURRENCY;
}

/** Create an expense (+ splits) in a transaction. */
async function createExpense(userId, payload) {
  const prepared = await prepareExpenseData(userId, payload);
  const source = payload.source && EXPENSE_SOURCES.includes(payload.source) ? payload.source : 'MANUAL';

  const expense = await prisma.$transaction(async (tx) => {
    const created = await tx.expense.create({
      data: {
        userId,
        title: payload.title || payload.description || 'Expense',
        description: payload.description || null,
        amount: prepared.amount,
        originalAmount: prepared.originalAmount,
        currency: prepared.currency,
        baseAmount: prepared.baseAmount,
        baseCurrency: prepared.baseCurrency,
        exchangeRate: prepared.exchangeRate,
        category: prepared.category,
        expenseDate: new Date(prepared.expenseDate),
        paymentMethod: payload.paymentMethod || null,
        notes: payload.notes || null,
        source,
        paidById: prepared.paidById,
        groupId: payload.groupId || null,
        receiptId: payload.receiptId || null,
        idempotencyKey: payload.idempotencyKey || null,
        splits: {
          create: prepared.splits.map((s) => ({
            userId: s.userId,
            amount: s.amount,
            percentage: s.percentage,
            shares: s.shares,
          })),
        },
      },
      include: { splits: { include: { user: { select: { id: true, name: true } } } }, paidBy: { select: { id: true, name: true } } },
    });
    return created;
  });
  return expense;
}

/** Update an expense (+ replace splits) in a transaction. */
async function updateExpense(userId, expenseId, payload) {
  const existing = await prisma.expense.findFirst({ where: { id: expenseId, userId } });
  if (!existing) throw new Error('Expense not found');
  if (existing.source === 'OCR' && payload.groupId && payload.groupId !== existing.groupId) {
    // group move allowed on edit
  }

  const merged = {
    ...existing,
    amount: payload.amount ?? toNumber(existing.amount),
    currency: payload.currency || existing.currency,
    category: payload.category || existing.category,
    expenseDate: payload.expenseDate || toISODate(existing.expenseDate),
    description: payload.description !== undefined ? payload.description : existing.description,
    title: payload.title || existing.title,
    paymentMethod: payload.paymentMethod !== undefined ? payload.paymentMethod : existing.paymentMethod,
    notes: payload.notes !== undefined ? payload.notes : existing.notes,
    groupId: payload.groupId !== undefined ? payload.groupId : existing.groupId,
    paidById: payload.paidById || existing.paidById,
    splits: payload.splits || existing.splits?.map((s) => ({ userId: s.userId, amount: toNumber(s.amount), percentage: s.percentage, shares: s.shares })),
    splitType: payload.splitType,
  };

  const prepared = await prepareExpenseData(userId, merged);
  const splitRows = prepared.splits.map((s) => ({
    userId: s.userId,
    amount: s.amount,
    percentage: s.percentage,
    shares: s.shares,
  }));

  return prisma.$transaction(async (tx) => {
    await tx.expenseSplit.deleteMany({ where: { expenseId } });
    const updated = await tx.expense.update({
      where: { id: expenseId },
      data: {
        title: merged.title,
        description: merged.description || null,
        amount: prepared.amount,
        originalAmount: prepared.originalAmount,
        currency: prepared.currency,
        baseAmount: prepared.baseAmount,
        baseCurrency: prepared.baseCurrency,
        exchangeRate: prepared.exchangeRate,
        category: prepared.category,
        expenseDate: new Date(prepared.expenseDate),
        paymentMethod: merged.paymentMethod || null,
        notes: merged.notes || null,
        paidById: prepared.paidById,
        groupId: prepared.groupId,
        splits: { create: splitRows },
      },
      include: { splits: { include: { user: { select: { id: true, name: true } } } }, paidBy: { select: { id: true, name: true } } },
    });
    return updated;
  });
}

/** Serialize an expense row (or with splits) for API responses. */
function serializeExpense(expense) {
  return {
    ...expense,
    amount: toNumber(expense.amount),
    originalAmount: toNumber(expense.originalAmount),
    baseAmount: toNumber(expense.baseAmount),
    exchangeRate: expense.exchangeRate?.toString?.(),
    splits: (expense.splits || []).map((s) => ({
      id: s.id,
      userId: s.userId,
      userName: s.user?.name,
      amount: toNumber(s.amount),
      percentage: s.percentage != null ? Number(s.percentage) : null,
      shares: s.shares != null ? Number(s.shares) : null,
    })),
    paidBy: expense.paidBy ? { id: expense.paidBy.id, name: expense.paidBy.name } : null,
  };
}

module.exports = { createExpense, updateExpense, serializeExpense, prepareExpenseData, defaultCurrencyOf };