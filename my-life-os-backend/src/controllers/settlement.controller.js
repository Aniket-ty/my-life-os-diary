const prisma = require('../config/database');
const { toMinor, toNumber } = require('../utils/money');
const { validateCurrency } = require('../services/currency.service');
const { notifyUser } = require('../services/notification.service');
const { DEFAULT_CURRENCY } = require('../utils/constants');

/**
 * Record a settlement (e.g. Rahul paid Aniket ₹400)
 */
exports.createSettlement = async (req, res, next) => {
  try {
    const currentUserId = req.user.id;
    const { groupId, fromUserId, toUserId, amount, currency = DEFAULT_CURRENCY, note, settledAt } = req.body;

    if (!groupId) return res.status(400).json({ error: 'groupId is required' });
    if (!fromUserId) return res.status(400).json({ error: 'fromUserId is required' });
    if (!toUserId) return res.status(400).json({ error: 'toUserId is required' });
    if (fromUserId === toUserId) return res.status(400).json({ error: 'fromUser and toUser cannot be the same person' });

    const minorAmount = toMinor(amount);
    if (minorAmount <= 0n) return res.status(400).json({ error: 'amount must be greater than zero' });

    // Validate group and membership
    const group = await prisma.expenseGroup.findUnique({
      where: { id: groupId },
      include: { members: true },
    });

    if (!group) return res.status(404).json({ error: 'Group not found' });

    const memberIds = new Set(group.members.map((m) => m.userId));
    if (!memberIds.has(fromUserId) || !memberIds.has(toUserId)) {
      return res.status(400).json({ error: 'Both users must be members of the group' });
    }

    // Must be a member or admin to record settlement
    if (!memberIds.has(currentUserId)) {
      return res.status(403).json({ error: 'You are not a member of this group' });
    }

    const validatedCurrency = validateCurrency(currency);
    const date = settledAt ? new Date(settledAt) : new Date();

    const settlement = await prisma.expenseSettlement.create({
      data: {
        groupId,
        fromUserId,
        toUserId,
        amount: toNumber(minorAmount),
        currency: validatedCurrency,
        note: note ? note.trim() : null,
        settledAt: date,
      },
      include: {
        fromUser: { select: { id: true, name: true, email: true } },
        toUser: { select: { id: true, name: true, email: true } },
        group: { select: { id: true, name: true } },
      },
    });

    // Notify payee
    await notifyUser(toUserId, {
      title: 'Settlement Payment Received',
      message: `${settlement.fromUser.name} recorded a payment of ₹${settlement.amount} to you in ${settlement.group.name}.`,
      type: 'settlement',
      data: { settlementId: settlement.id, groupId: settlement.groupId },
    });

    // If recorded by third-party admin or payee, notify payer as well
    if (currentUserId !== fromUserId) {
      await notifyUser(fromUserId, {
        title: 'Settlement Recorded',
        message: `${req.user.name} recorded that you paid ₹${settlement.amount} to ${settlement.toUser.name} in ${settlement.group.name}.`,
        type: 'settlement',
        data: { settlementId: settlement.id, groupId: settlement.groupId },
      });
    }

    res.status(201).json(settlement);
  } catch (error) {
    next(error);
  }
};

/**
 * Get settlement history for a group
 */
exports.getGroupSettlements = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;

    const group = await prisma.expenseGroup.findUnique({
      where: { id: groupId },
      include: { members: true },
    });

    if (!group) return res.status(404).json({ error: 'Group not found' });
    const isMember = group.members.some((m) => m.userId === userId);
    if (!isMember) return res.status(403).json({ error: 'You are not a member of this group' });

    const settlements = await prisma.expenseSettlement.findMany({
      where: { groupId },
      orderBy: { settledAt: 'desc' },
      include: {
        fromUser: { select: { id: true, name: true, email: true } },
        toUser: { select: { id: true, name: true, email: true } },
      },
    });

    res.json(settlements);
  } catch (error) {
    next(error);
  }
};

/**
 * Delete / cancel a settlement
 */
exports.deleteSettlement = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const settlement = await prisma.expenseSettlement.findUnique({
      where: { id },
      include: {
        group: { include: { members: true } },
      },
    });

    if (!settlement) return res.status(404).json({ error: 'Settlement not found' });

    const isParty = settlement.fromUserId === userId || settlement.toUserId === userId;
    const isAdmin = settlement.group.members.some((m) => m.userId === userId && m.role === 'admin');

    if (!isParty && !isAdmin) {
      return res.status(403).json({ error: 'Not authorized to delete this settlement' });
    }

    await prisma.expenseSettlement.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
