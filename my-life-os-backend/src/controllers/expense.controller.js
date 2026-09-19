const prisma = require('../config/database');
const expenseService = require('../services/expense.service');
const { toISODate, dayRange, weekRange, monthRange } = require('../utils/dates');
const { toNumber, toMinor } = require('../utils/money');
const { EXPENSE_CATEGORIES } = require('../utils/constants');
const { notifyUser } = require('../services/notification.service');

/**
 * Get dashboard statistics for expenses:
 * - Today's total and category breakdown
 * - This week's total
 * - This month's total
 * - Top categories this month
 * - Recent expenses
 * - Largest expenses this month
 * - Daily spending for the last 7 days
 */
exports.getExpenseSummary = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const now = new Date();
    const todayStr = toISODate(now);

    const todayR = dayRange(now);
    const weekR = weekRange(now);
    const monthR = monthRange(now);

    // Run queries concurrently
    const [allUserExpenses, recentExpenses, largestExpenses] = await Promise.all([
      prisma.expense.findMany({
        where: {
          OR: [
            { userId },
            { splits: { some: { userId } } },
          ],
        },
        select: {
          id: true,
          amount: true,
          baseAmount: true,
          baseCurrency: true,
          currency: true,
          category: true,
          expenseDate: true,
          title: true,
          userId: true,
          paidById: true,
          groupId: true,
          splits: {
            where: { userId },
            select: { amount: true },
          },
        },
        orderBy: { expenseDate: 'desc' },
      }),
      prisma.expense.findMany({
        where: {
          OR: [
            { userId },
            { splits: { some: { userId } } },
          ],
        },
        take: 6,
        orderBy: { expenseDate: 'desc' },
        include: {
          paidBy: { select: { id: true, name: true } },
          group: { select: { id: true, name: true } },
          splits: { include: { user: { select: { id: true, name: true } } } },
        },
      }),
      prisma.expense.findMany({
        where: {
          userId,
          expenseDate: { gte: monthR.start, lt: monthR.end },
        },
        take: 5,
        orderBy: { baseAmount: 'desc' },
        include: {
          group: { select: { id: true, name: true } },
        },
      }),
    ]);

    let todayTotal = 0;
    let weekTotal = 0;
    let monthTotal = 0;
    const categoryTotals = {};
    const todayCategoryTotals = {};
    const last7DaysMap = {};

    // Initialize last 7 days
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      last7DaysMap[toISODate(d)] = 0;
    }

    const defaultCurrency = await expenseService.defaultCurrencyOf(userId);

    for (const exp of allUserExpenses) {
      const expDate = new Date(exp.expenseDate);
      const expDateStr = toISODate(expDate);
      // User's actual share in group expenses, or base amount for personal
      let userCost = toNumber(exp.baseAmount);
      if (exp.groupId && exp.splits && exp.splits.length > 0) {
        userCost = toNumber(exp.splits[0].amount);
      }

      // Today's total
      if (expDate >= todayR.start && expDate < todayR.end) {
        todayTotal += userCost;
        todayCategoryTotals[exp.category] = (todayCategoryTotals[exp.category] || 0) + userCost;
      }

      // Week total
      if (expDate >= weekR.start && expDate < weekR.end) {
        weekTotal += userCost;
      }

      // Month total
      if (expDate >= monthR.start && expDate < monthR.end) {
        monthTotal += userCost;
        categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + userCost;
      }

      // Last 7 days trend
      if (last7DaysMap[expDateStr] !== undefined) {
        last7DaysMap[expDateStr] += userCost;
      }
    }

    const dailyTrend = Object.keys(last7DaysMap).map((date) => ({
      date,
      total: Math.round(last7DaysMap[date] * 100) / 100,
    }));

    const categoryBreakdown = Object.keys(categoryTotals).map((cat) => ({
      category: cat,
      amount: Math.round(categoryTotals[cat] * 100) / 100,
      percentage: monthTotal > 0 ? Math.round((categoryTotals[cat] / monthTotal) * 100) : 0,
    })).sort((a, b) => b.amount - a.amount);

    res.json({
      currency: defaultCurrency,
      today: {
        total: Math.round(todayTotal * 100) / 100,
        categories: todayCategoryTotals,
      },
      thisWeek: {
        total: Math.round(weekTotal * 100) / 100,
      },
      thisMonth: {
        total: Math.round(monthTotal * 100) / 100,
        categories: categoryBreakdown,
      },
      dailyTrend,
      recentExpenses: recentExpenses.map(expenseService.serializeExpense),
      largestExpenses: largestExpenses.map(expenseService.serializeExpense),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * List expenses with search, date filter, category filter, group filter, and pagination.
 */
exports.getExpenses = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const {
      startDate,
      endDate,
      category,
      source,
      groupId,
      search,
      sortBy = 'expenseDate',
      sortOrder = 'desc',
      page = 1,
      limit = 30,
    } = req.query;

    const where = {
      OR: [
        { userId },
        { splits: { some: { userId } } },
      ],
    };

    if (groupId) {
      where.groupId = groupId;
    }

    if (category) {
      where.category = category;
    }

    if (source) {
      where.source = source;
    }

    if (startDate || endDate) {
      where.expenseDate = {};
      if (startDate) where.expenseDate.gte = new Date(startDate);
      if (endDate) where.expenseDate.lte = new Date(endDate);
    }

    if (search && search.trim()) {
      const q = search.trim();
      where.AND = [
        {
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
            { notes: { contains: q, mode: 'insensitive' } },
          ],
        },
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 30));
    const skip = (pageNum - 1) * limitNum;

    const orderBy = {};
    const validSortFields = ['expenseDate', 'amount', 'createdAt', 'title'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'expenseDate';
    orderBy[sortField] = sortOrder.toLowerCase() === 'asc' ? 'asc' : 'desc';

    const [total, expenses] = await Promise.all([
      prisma.expense.count({ where }),
      prisma.expense.findMany({
        where,
        skip,
        take: limitNum,
        orderBy,
        include: {
          splits: {
            include: {
              user: { select: { id: true, name: true, email: true } },
            },
          },
          paidBy: { select: { id: true, name: true, email: true } },
          group: { select: { id: true, name: true, defaultCurrency: true } },
          receipt: { select: { id: true, imageUrl: true, merchant: true } },
        },
      }),
    ]);

    res.json({
      expenses: expenses.map(expenseService.serializeExpense),
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get expense by ID
 */
exports.getExpenseById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const expense = await prisma.expense.findUnique({
      where: { id },
      include: {
        splits: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
        paidBy: { select: { id: true, name: true, email: true } },
        group: {
          include: {
            members: {
              include: { user: { select: { id: true, name: true, email: true } } },
            },
          },
        },
        receipt: true,
      },
    });

    if (!expense) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    const isOwner = expense.userId === userId;
    const isPayer = expense.paidById === userId;
    const isSplitMember = expense.splits.some((s) => s.userId === userId);
    const isGroupMember = expense.group?.members.some((m) => m.userId === userId);

    if (!isOwner && !isPayer && !isSplitMember && !isGroupMember) {
      return res.status(403).json({ error: 'You do not have access to this expense' });
    }

    res.json(expenseService.serializeExpense(expense));
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new expense using the authoritative expense service.
 */
exports.createExpense = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const payload = req.body;

    // Optional Idempotency key to prevent double submits
    if (payload.idempotencyKey) {
      const existing = await prisma.expense.findUnique({
        where: { idempotencyKey: payload.idempotencyKey },
        include: {
          splits: { include: { user: { select: { id: true, name: true } } } },
          paidBy: { select: { id: true, name: true } },
        },
      });
      if (existing) {
        return res.status(200).json(expenseService.serializeExpense(existing));
      }
    }

    const expense = await expenseService.createExpense(userId, payload);

    // Notify split members in real time
    if (expense.splits && expense.splits.length > 0) {
      const serialized = expenseService.serializeExpense(expense);
      for (const split of serialized.splits) {
        if (split.userId && split.userId !== userId) {
          notifyUser(split.userId, {
            title: 'New Shared Expense',
            message: `${req.user.name || 'A friend'} added "${expense.title}" (Your share: ₹${split.amount})`,
            type: 'expense',
            data: { expenseId: expense.id, groupId: expense.groupId || '' },
          });
        }
      }
    }

    res.status(201).json(expenseService.serializeExpense(expense));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

/**
 * Update an existing expense.
 */
exports.updateExpense = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const payload = req.body;

    const updated = await expenseService.updateExpense(userId, id, payload);

    // Notify split members of changes
    if (updated.splits && updated.splits.length > 0) {
      const serialized = expenseService.serializeExpense(updated);
      for (const split of serialized.splits) {
        if (split.userId && split.userId !== userId) {
          notifyUser(split.userId, {
            title: 'Expense Updated',
            message: `${req.user.name || 'A friend'} updated "${updated.title}" (Your share: ₹${split.amount})`,
            type: 'expense',
            data: { expenseId: updated.id, groupId: updated.groupId || '' },
          });
        }
      }
    }

    res.json(expenseService.serializeExpense(updated));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

/**
 * Delete an expense.
 */
exports.deleteExpense = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const existing = await prisma.expense.findUnique({
      where: { id },
      include: { group: { include: { members: true } } },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    const isCreator = existing.userId === userId;
    const isGroupAdmin = existing.group?.members.some(
      (m) => m.userId === userId && m.role === 'admin'
    );

    if (!isCreator && !isGroupAdmin) {
      return res.status(403).json({ error: 'Not authorized to delete this expense' });
    }

    await prisma.expense.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

/**
 * Export personal expenses to standard CSV format
 */
exports.exportExpensesCsv = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { startDate, endDate, category, groupId } = req.query;

    const where = {
      OR: [
        { userId },
        { splits: { some: { userId } } },
      ],
    };

    if (groupId) where.groupId = groupId;
    if (category) where.category = category;
    if (startDate || endDate) {
      where.expenseDate = {};
      if (startDate) where.expenseDate.gte = new Date(startDate);
      if (endDate) where.expenseDate.lte = new Date(endDate);
    }

    const expenses = await prisma.expense.findMany({
      where,
      orderBy: { expenseDate: 'desc' },
      include: {
        paidBy: { select: { name: true } },
        group: { select: { name: true } },
      },
    });

    const headers = [
      'Date',
      'Title',
      'Category',
      'Amount',
      'Currency',
      'Base Amount',
      'Base Currency',
      'Payment Method',
      'Paid By',
      'Group',
      'Notes',
    ];

    const escapeCsv = (val) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = expenses.map((e) => [
      toISODate(new Date(e.expenseDate)),
      escapeCsv(e.title),
      escapeCsv(e.category),
      toNumber(e.amount),
      e.currency,
      toNumber(e.baseAmount),
      e.baseCurrency,
      escapeCsv(e.paymentMethod || ''),
      escapeCsv(e.paidBy?.name || ''),
      escapeCsv(e.group?.name || 'Personal'),
      escapeCsv(e.notes || ''),
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="expenses-${toISODate(new Date())}.csv"`);
    res.status(200).send(csvContent);
  } catch (error) {
    next(error);
  }
};

/**
 * Get list of available categories
 */
exports.getCategories = (req, res) => {
  res.json({ categories: EXPENSE_CATEGORIES });
};
