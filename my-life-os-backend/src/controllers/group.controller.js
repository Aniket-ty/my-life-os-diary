const prisma = require('../config/database');
const { calculateGroupBalances, suggestSettlements } = require('../services/balance.service');
const { serializeExpense } = require('../services/expense.service');
const { validateCurrency } = require('../services/currency.service');
const { DEFAULT_CURRENCY } = require('../utils/constants');
const { toISODate } = require('../utils/dates');
const { toNumber } = require('../utils/money');
const { v4: uuidv4 } = require('../utils/uuid');
const { notifyUser, sendInviteToNonAppUser } = require('../services/notification.service');
const { normalizePhoneNumber, getPhoneSearchPatterns } = require('../utils/phone');

/**
 * Create a new group and add creator as admin
 */
exports.createGroup = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { name, description, defaultCurrency, memberEmails = [] } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Group name is required' });
    }

    const currency = defaultCurrency ? validateCurrency(defaultCurrency) : DEFAULT_CURRENCY;

    const group = await prisma.$transaction(async (tx) => {
      const created = await tx.expenseGroup.create({
        data: {
          name: name.trim(),
          description: description?.trim() || null,
          createdBy: userId,
          defaultCurrency: currency,
          members: {
            create: {
              userId,
              role: 'admin',
            },
          },
        },
        include: {
          members: {
            include: {
              user: { select: { id: true, name: true, email: true } },
            },
          },
        },
      });

      // If initial member emails were provided, resolve and invite them
      if (Array.isArray(memberEmails) && memberEmails.length > 0) {
        for (const email of memberEmails) {
          const cleanEmail = String(email).trim().toLowerCase();
          if (!cleanEmail) continue;
          const user = await tx.user.findUnique({ where: { email: cleanEmail } });
          if (user && user.id !== userId) {
            await tx.expenseGroupMember.upsert({
              where: { groupId_userId: { groupId: created.id, userId: user.id } },
              create: { groupId: created.id, userId: user.id, role: 'member' },
              update: {},
            });
          }
        }
      }

      return tx.expenseGroup.findUnique({
        where: { id: created.id },
        include: {
          members: {
            include: {
              user: { select: { id: true, name: true, email: true } },
            },
          },
        },
      });
    });

    res.status(201).json(group);
  } catch (error) {
    next(error);
  }
};

/**
 * List all groups that the user is a member of, with live net balance for the user
 */
exports.getUserGroups = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const groups = await prisma.expenseGroup.findMany({
      where: {
        members: { some: { userId } },
      },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
        expenses: {
          include: {
            splits: true,
          },
        },
        settlements: true,
      },
      orderBy: { updatedAt: 'desc' },
    });

    const groupsWithBalances = groups.map((group) => {
      const balanceData = calculateGroupBalances({
        expenses: group.expenses,
        settlements: group.settlements,
        members: group.members.map((m) => ({ id: m.userId, name: m.user.name })),
      });

      const userRow = balanceData.members.find((m) => m.userId === userId);
      const userNet = userRow ? userRow.net : 0;

      return {
        id: group.id,
        name: group.name,
        description: group.description,
        defaultCurrency: group.defaultCurrency,
        createdBy: group.createdBy,
        createdAt: group.createdAt,
        updatedAt: group.updatedAt,
        memberCount: group.members.length,
        members: group.members.map((m) => ({
          id: m.userId,
          name: m.user.name,
          email: m.user.email,
          role: m.role,
          joinedAt: m.joinedAt,
        })),
        totalExpenseCount: group.expenses.length,
        totalPaid: balanceData.totalPaid,
        userNetBalance: userNet, // Positive = owed to user, Negative = user owes
      };
    });

    res.json(groupsWithBalances);
  } catch (error) {
    next(error);
  }
};

/**
 * Get detailed group dashboard: members, balances, suggested settlements, expense history
 */
exports.getGroupById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const group = await prisma.expenseGroup.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
        expenses: {
          orderBy: { expenseDate: 'desc' },
          include: {
            paidBy: { select: { id: true, name: true } },
            splits: {
              include: {
                user: { select: { id: true, name: true } },
              },
            },
            receipt: { select: { id: true, imageUrl: true, merchant: true } },
          },
        },
        settlements: {
          orderBy: { settledAt: 'desc' },
          include: {
            fromUser: { select: { id: true, name: true } },
            toUser: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const isMember = group.members.some((m) => m.userId === userId);
    if (!isMember) {
      return res.status(403).json({ error: 'You are not a member of this group' });
    }

    const membersForBalance = group.members.map((m) => ({ id: m.userId, name: m.user.name }));

    const balanceData = calculateGroupBalances({
      expenses: group.expenses,
      settlements: group.settlements,
      members: membersForBalance,
    });

    res.json({
      id: group.id,
      name: group.name,
      description: group.description,
      defaultCurrency: group.defaultCurrency,
      createdBy: group.createdBy,
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
      members: group.members.map((m) => ({
        id: m.userId,
        name: m.user.name,
        email: m.user.email,
        role: m.role,
        joinedAt: m.joinedAt,
      })),
      expenses: group.expenses.map(serializeExpense),
      settlements: group.settlements,
      balances: balanceData.members,
      debts: balanceData.debts, // raw debt relations
      suggestedSettlements: balanceData.simplified, // greedy optimized minimal transfers
      totalSpent: balanceData.totalPaid,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update group information
 */
exports.updateGroup = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { name, description, defaultCurrency } = req.body;

    const group = await prisma.expenseGroup.findUnique({
      where: { id },
      include: { members: true },
    });

    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const member = group.members.find((m) => m.userId === userId);
    if (!member || member.role !== 'admin') {
      return res.status(403).json({ error: 'Only group admins can edit group details' });
    }

    const data = {};
    if (name) data.name = name.trim();
    if (description !== undefined) data.description = description ? description.trim() : null;
    if (defaultCurrency) data.defaultCurrency = validateCurrency(defaultCurrency);

    const updated = await prisma.expenseGroup.update({
      where: { id },
      data,
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a group (only creator or admin)
 */
exports.deleteGroup = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const group = await prisma.expenseGroup.findUnique({
      where: { id },
      include: { members: true },
    });

    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    if (group.createdBy !== userId) {
      const admin = group.members.find((m) => m.userId === userId && m.role === 'admin');
      if (!admin) {
        return res.status(403).json({ error: 'Only the creator or admin can delete this group' });
      }
    }

    await prisma.expenseGroup.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

/**
 * Add member to group by email, phone number, or userId.
 * If user is not yet registered on Life OS, sends an email/SMS invite and creates a PendingInvite.
 */
exports.addMember = async (req, res, next) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user.id;
    const { email, phoneNumber, userId: targetUserId, role = 'member' } = req.body;

    const group = await prisma.expenseGroup.findUnique({
      where: { id },
      include: { members: true },
    });

    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const isMember = group.members.some((m) => m.userId === currentUserId);
    if (!isMember) {
      return res.status(403).json({ error: 'You must be a group member to invite others' });
    }

    let targetUser = null;
    if (targetUserId) {
      targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
    } else if (email) {
      targetUser = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    } else if (phoneNumber) {
      const normPhone = normalizePhoneNumber(phoneNumber);
      const patterns = getPhoneSearchPatterns(phoneNumber);
      targetUser = await prisma.user.findFirst({
        where: {
          OR: [
            ...(normPhone ? [{ phoneNumber: normPhone }] : []),
            ...patterns.map((p) => ({ phoneNumber: { contains: p } })),
          ],
        },
      });
    }

    // If user is already on Life OS, add them directly
    if (targetUser) {
      const alreadyMember = group.members.some((m) => m.userId === targetUser.id);
      if (alreadyMember) {
        return res.status(400).json({ error: 'User is already a member of this group' });
      }

      const newMember = await prisma.expenseGroupMember.create({
        data: {
          groupId: id,
          userId: targetUser.id,
          role: role === 'admin' ? 'admin' : 'member',
        },
        include: {
          user: { select: { id: true, name: true, email: true, phoneNumber: true } },
        },
      });

      // Notify the added user
      await notifyUser(targetUser.id, {
        title: 'Added to Group',
        message: `${req.user.name} added you to "${group.name}".`,
        type: 'group',
        data: { groupId: group.id },
      });

      return res.status(201).json(newMember);
    }

    // User is NOT yet registered on Life OS: create a PendingInvite & send invitation
    if (!email && !phoneNumber) {
      return res.status(400).json({ error: 'Email or phone number is required to invite a user' });
    }

    const cleanEmail = email ? email.trim().toLowerCase() : null;
    const cleanPhone = phoneNumber ? normalizePhoneNumber(phoneNumber) : null;

    const token = uuidv4();
    const pendingInvite = await prisma.pendingInvite.create({
      data: {
        inviterId: currentUserId,
        email: cleanEmail,
        phoneNumber: cleanPhone,
        groupId: id,
        status: 'pending',
        token,
      },
    });

    await sendInviteToNonAppUser({
      toEmail: cleanEmail,
      toPhone: cleanPhone,
      inviterName: req.user.name,
      groupName: group.name,
      amount: null,
      inviteToken: token,
    });

    res.status(200).json({
      pending: true,
      invite: pendingInvite,
      message: `Invitation successfully sent to ${cleanEmail || cleanPhone}! They will be linked to "${group.name}" as soon as they sign up.`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Remove member from group (requires balance to be 0)
 */
exports.removeMember = async (req, res, next) => {
  try {
    const { id, memberId } = req.params;
    const currentUserId = req.user.id;

    const group = await prisma.expenseGroup.findUnique({
      where: { id },
      include: {
        members: {
          include: { user: true },
        },
        expenses: { include: { splits: true } },
        settlements: true,
      },
    });

    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const currentUserMember = group.members.find((m) => m.userId === currentUserId);
    if (!currentUserMember || currentUserMember.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can remove members' });
    }

    // Verify target member exists
    const target = group.members.find((m) => m.userId === memberId);
    if (!target) {
      return res.status(404).json({ error: 'Member not found in this group' });
    }

    // Calculate balances to ensure target member balance is 0
    const balanceData = calculateGroupBalances({
      expenses: group.expenses,
      settlements: group.settlements,
      members: group.members.map((m) => ({ id: m.userId, name: m.user.name })),
    });

    const targetRow = balanceData.members.find((m) => m.userId === memberId);
    if (targetRow && Math.abs(targetRow.net) > 0.01) {
      return res.status(400).json({
        error: `Cannot remove member with non-zero balance (Net: ₹${targetRow.net}). Please settle balances first.`,
      });
    }

    await prisma.expenseGroupMember.delete({
      where: { groupId_userId: { groupId: id, userId: memberId } },
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

/**
 * Leave group (requires balance to be 0)
 */
exports.leaveGroup = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const group = await prisma.expenseGroup.findUnique({
      where: { id },
      include: {
        members: { include: { user: true } },
        expenses: { include: { splits: true } },
        settlements: true,
      },
    });

    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const isMember = group.members.some((m) => m.userId === userId);
    if (!isMember) {
      return res.status(400).json({ error: 'You are not in this group' });
    }

    // Calculate balances
    const balanceData = calculateGroupBalances({
      expenses: group.expenses,
      settlements: group.settlements,
      members: group.members.map((m) => ({ id: m.userId, name: m.user.name })),
    });

    const userRow = balanceData.members.find((m) => m.userId === userId);
    if (userRow && Math.abs(userRow.net) > 0.01) {
      return res.status(400).json({
        error: `Cannot leave group with an unsettled balance of ₹${userRow.net}. Please settle before leaving.`,
      });
    }

    await prisma.expenseGroupMember.delete({
      where: { groupId_userId: { groupId: id, userId } },
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

/**
 * Export group statement (balances, suggested settlements, expenses, settlements) as CSV
 */
exports.exportGroupCsv = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const group = await prisma.expenseGroup.findUnique({
      where: { id },
      include: {
        members: { include: { user: { select: { id: true, name: true, email: true, phoneNumber: true } } } },
        expenses: {
          include: {
            paidBy: { select: { name: true } },
            splits: { include: { user: { select: { name: true } } } },
          },
          orderBy: { expenseDate: 'desc' },
        },
        settlements: {
          include: {
            fromUser: { select: { name: true } },
            toUser: { select: { name: true } },
          },
          orderBy: { settledAt: 'desc' },
        },
      },
    });

    if (!group) return res.status(404).json({ error: 'Group not found' });
    const isMember = group.members.some((m) => m.userId === userId);
    if (!isMember) return res.status(403).json({ error: 'You are not a member of this group' });

    const balanceData = calculateGroupBalances({
      expenses: group.expenses,
      settlements: group.settlements,
      members: group.members.map((m) => ({ id: m.userId, name: m.user.name })),
    });

    const suggested = suggestSettlements(balanceData.members);

    const escapeCsv = (val) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const lines = [];
    lines.push(`GROUP EXPENSE STATEMENT: ${escapeCsv(group.name)}`);
    lines.push(`Generated On: ${toISODate(new Date())}, Currency: ${group.defaultCurrency}`);
    lines.push('');

    lines.push('--- MEMBER BALANCES ---');
    lines.push('Member Name,Email,Total Paid,Total Share,Net Balance,Status');
    for (const m of balanceData.members) {
      const status = m.net > 0 ? `Gets back ₹${m.net}` : m.net < 0 ? `Owes ₹${Math.abs(m.net)}` : 'Settled up';
      const memberInfo = group.members.find((gm) => gm.userId === m.userId);
      lines.push(`${escapeCsv(m.name)},${escapeCsv(memberInfo?.user?.email || '')},${m.paid},${m.share},${m.net},${escapeCsv(status)}`);
    }
    lines.push('');

    lines.push('--- SUGGESTED SETTLEMENTS ---');
    lines.push('From (Debtor),To (Creditor),Amount');
    for (const s of suggested) {
      lines.push(`${escapeCsv(s.fromName)},${escapeCsv(s.toName)},${s.amount}`);
    }
    lines.push('');

    lines.push('--- ALL EXPENSES ---');
    lines.push('Date,Title,Category,Total Amount,Currency,Paid By,Split Details');
    for (const exp of group.expenses) {
      const splitDetail = exp.splits.map((s) => `${s.user?.name}: ${toNumber(s.amount)}`).join('; ');
      lines.push(`${toISODate(new Date(exp.expenseDate))},${escapeCsv(exp.title)},${escapeCsv(exp.category)},${toNumber(exp.amount)},${exp.currency},${escapeCsv(exp.paidBy?.name || '')},${escapeCsv(splitDetail)}`);
    }
    lines.push('');

    lines.push('--- SETTLEMENT HISTORY ---');
    lines.push('Date,Payer,Payee,Amount,Currency,Note');
    for (const s of group.settlements) {
      lines.push(`${toISODate(new Date(s.settledAt))},${escapeCsv(s.fromUser?.name || '')},${escapeCsv(s.toUser?.name || '')},${toNumber(s.amount)},${s.currency},${escapeCsv(s.note || '')}`);
    }

    const csvContent = lines.join('\n');
    const safeGroupName = group.name.replace(/[^a-zA-Z0-9_-]/g, '_');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${safeGroupName}_statement.csv"`);
    res.status(200).send(csvContent);
  } catch (error) {
    next(error);
  }
};
