// Voice command orchestration.
//
// Flow: transcript -> AI parse -> (Node) resolution + validation -> either an
// immediate read result OR a pending write action awaiting confirmation.
// Node is the AUTHORITY: it decides permissions, validates every field and
// performs every database write. The AI only ever produces a structured,
// server-stored action request.

const prisma = require('../config/database');
const crypto = require('crypto');
const gateway = require('./ai/gateway');
const { sanitiseParseResult } = require('./ai/contracts');
const { parseAmountExpression } = require('../utils/dates');
const { findCategory, findCurrency } = require('./ai/heuristicParser');
const { createExpense, serializeExpense } = require('./expense.service');
const { buildSplits } = require('./expenseSplit.service');
const { toMinor, toNumber } = require('../utils/money');
const { calculateGroupBalances, pairwiseBalance } = require('./balance.service');
const { convertAmount, validateCurrency } = require('./currency.service');
const {
  EXPENSE_CATEGORIES, LARGE_EXPENSE_THRESHOLD, DEFAULT_CURRENCY,
} = require('../utils/constants');
const { notifyUser } = require('./notification.service');
const { getPhoneSearchPatterns } = require('../utils/phone');
const { matchEquipmentInDb } = require('./equipmentMatching.service');

const PENDING_TTL_MS = 10 * 60 * 1000;
const pendingStore = new Map(); // serverCommandId -> { action, userId, createdAt }

function cleanupPending() {
  const now = Date.now();
  for (const [id, pending] of pendingStore) {
    if (now - pending.createdAt > PENDING_TTL_MS) pendingStore.delete(id);
  }
}

function storePending(userId, action) {
  cleanupPending();
  const id = crypto.randomUUID();
  pendingStore.set(id, { id, action, userId, createdAt: Date.now() });
  return id;
}

function loadPending(serverCommandId) {
  const pending = pendingStore.get(serverCommandId);
  if (!pending) throw new Error('That voice command has expired. Please try again.');
  if (Date.now() - pending.createdAt > PENDING_TTL_MS) {
    pendingStore.delete(serverCommandId);
    throw new Error('That voice command has expired. Please try again.');
  }
  return pending;
}

function moneyOut(text) {
  const amount = parseAmountExpression(text);
  return amount ? toNumber(toMinor(amount)) : null;
}

async function loadUserContext(userId) {
  const [user, groups] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.expenseGroup.findMany({
      where: { members: { some: { userId } } },
      include: { members: { include: { user: { select: { id: true, name: true, email: true } } } } },
    }),
  ]);
  const names = new Set(groups.flatMap((g) => g.members.map((m) => m.user.name)));
  return { user, groups, memberNames: [...names].filter(Boolean) };
}

/**
 * Entry point: turn a transcript into a structured, safe response.
 */
async function processVoiceCommand(userId, transcript) {
  const cleaned = String(transcript || '').trim();
  if (!cleaned) throw new Error('No command provided');

  const { user, groups } = await loadUserContext(userId);

  // 1. Parse (Python -> Groq -> heuristic fallback).
  const parsed = await gateway.parseCommand(cleaned, {
    groups: groups.map((g) => ({ id: g.id, name: g.name, defaultCurrency: g.defaultCurrency })),
    members: groups.flatMap((g) => g.members.map((m) => m.user.name)),
  });

  // Low confidence or explicit clarification needed?
  if (parsed.clarification && (parsed.confidence < 0.6)) {
    return {
      intent: parsed.intent,
      confidence: parsed.confidence,
      provider: parsed.provider,
      clarification: parsed.clarification,
      prefill: extractPrefill(cleaned, parsed.intent),
      speechText: parsed.clarification.question || 'Could you please clarify your request?',
    };
  }

  // 2. Resolve + prepare (Node validates).
  const result = await prepareAction(userId, cleaned, parsed, { user, groups });
  if (result && !result.speechText) {
    result.speechText = result.executionMessage || result.resultText || result.previewText || (result.route ? `Opening ${result.route}.` : 'Command processed.');
  }
  return result;
}

function extractPrefill(text, intent) {
  if (intent !== 'CREATE_EXPENSE') return {};
  return {
    amount: moneyOut(text),
    currency: findCurrency(text),
    category: findCategory(text),
    description: describeFrom(text),
  };
}

function describeFrom(text) {
  const m = String(text).toLowerCase().match(/\b(?:on|for)\s+([a-z][a-z0-9 ]{1,40})$/);
  return m ? m[1].replace(/\b(rupees?|inr|rs\b|dollars|euros|pounds?)\b/g, '').trim() : undefined;
}

// ── Resolution helpers ────────────────────────────────────────────────

function resolveGroupByName(name, groups) {
  if (!name) return { group: groups.length === 1 ? groups[0] : null, ambiguous: groups.length > 1, candidates: groups.map((g) => g.name) };
  const lower = name.toLowerCase();
  const exact = groups.find((g) => g.name.toLowerCase() === lower);
  if (exact) return { group: exact, ambiguous: false, candidates: [] };
  const subs = groups.filter((g) => g.name.toLowerCase().includes(lower));
  if (subs.length === 1) return { group: subs[0], ambiguous: false, candidates: [] };
  if (subs.length > 1) return { group: null, ambiguous: true, candidates: subs.map((g) => g.name) };
  return { group: null, ambiguous: false, candidates: groups.map((g) => g.name) };
}

function resolveMembers(names, group, meId) {
  const out = [];
  for (const raw of names || []) {
    const name = String(raw).trim();
    if (!name) continue;
    if (name === 'CURRENT_USER' || name.toLowerCase() === 'me' || name.toLowerCase() === 'i') {
      out.push(meId);
      continue;
    }
    const match = group.members.find((m) => m.user.name.toLowerCase() === name.toLowerCase());
    if (match) out.push(match.userId);
  }
  return out;
}

async function findUserByNameOrEmail(identifier) {
  const clean = String(identifier || '').trim();
  if (!clean) return { user: null, ambiguous: false, candidates: [] };
  const byEmail = await prisma.user.findUnique({ where: { email: clean.toLowerCase() } });
  if (byEmail) return { user: byEmail, ambiguous: false, candidates: [] };
  const byName = await prisma.user.findMany({ where: { name: { contains: clean, mode: 'insensitive' } }, take: 6 });
  if (byName.length === 1) return { user: byName[0], ambiguous: false, candidates: [] };
  if (byName.length > 1) return { user: null, ambiguous: true, candidates: byName.map((u) => `${u.name} <${u.email}>`) };
  return { user: null, ambiguous: false, candidates: [] };
}

// ── Read intents ──────────────────────────────────────────────────────

function periodRange(period, dateStr) {
  const now = dateStr ? new Date(dateStr) : new Date();
  if (period === 'yesterday') {
    const d = new Date(now); d.setDate(d.getDate() - 1);
    return { start: new Date(d.getFullYear(), d.getMonth(), d.getDate()), end: new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1), label: 'yesterday' };
  }
  if (period === 'today' || !period) {
    return { start: new Date(now.getFullYear(), now.getMonth(), now.getDate()), end: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1), label: 'today' };
  }
  if (period === 'lastWeek') {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
    return { start, end: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1), label: 'last 7 days' };
  }
  if (period === 'week') {
    const day = (now.getDay() + 6) % 7;
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day);
    return { start, end: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1), label: 'this week' };
  }
  if (period === 'lastMonth') {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 1);
    return { start, end, label: 'last month' };
  }
  // month (this month)
  return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: new Date(now.getFullYear(), now.getMonth() + 1, 1), label: 'this month' };
}

async function sumExpenses(userId, { category, period, date }) {
  const range = periodRange(period, date);
  const where = { userId, expenseDate: { gte: range.start, lt: range.end } };
  if (category && EXPENSE_CATEGORIES.includes(category)) where.category = category;
  const rows = await prisma.expense.findMany({ where, select: { baseAmount: true, currency: true, amount: true } });
  const total = rows.reduce((sum, r) => sum + toMinor(r.baseAmount), 0n);
  return { total: toNumber(total), count: rows.length, range: range.label, category };
}

function getMuscleMatchTerms(muscle) {
  const m = String(muscle || '').toLowerCase();
  if (/leg|quad|hamstring|calf|calves|thigh|squat/.test(m)) {
    return ['quadriceps', 'hamstring', 'calf', 'calves', 'glute', 'adductor', 'leg', 'thigh', 'squat'];
  }
  if (/chest|pec/.test(m)) {
    return ['chest', 'pectoral', 'pec'];
  }
  if (/back|lat|row|pull/.test(m)) {
    return ['lat', 'back', 'rhomboid', 'trapezius', 'trap'];
  }
  if (/shoulder|delt/.test(m)) {
    return ['shoulder', 'deltoid', 'delt'];
  }
  if (/arm|bicep|tricep|curl|dip/.test(m)) {
    return ['bicep', 'tricep', 'brachialis', 'forearm', 'arm'];
  }
  if (/core|ab|abdominal/.test(m)) {
    return ['core', 'abs', 'abdominal'];
  }
  if (/glute|hip|butt/.test(m)) {
    return ['glute', 'hip'];
  }
  return [m];
}

function matchesMuscleGroup(exercise, matchTerms) {
  const pm = (exercise.primaryMuscle || '').toLowerCase();
  const sm = Array.isArray(exercise.secondaryMuscles) ? exercise.secondaryMuscles.map((s) => String(s).toLowerCase()) : [];
  const name = (exercise.name || '').toLowerCase();

  return matchTerms.some((term) => pm.includes(term) || sm.some((s) => s.includes(term)) || name.includes(term));
}

// ── Action preparation ────────────────────────────────────────────────

async function prepareAction(userId, transcript, parsed, { user, groups }) {
  const intent = parsed.intent;
  const e = parsed.entities || {};

  switch (intent) {
    case 'GET_DAILY_TOTAL': {
      const { total, count, range } = await sumExpenses(userId, { period: e.period || 'today', date: e.date });
      return {
        intent, confidence: parsed.confidence, provider: parsed.provider, kind: 'result',
        resultText: `You spent ${currencyText(user.defaultCurrency, total)} ${range}${count ? ` across ${count} expense${count > 1 ? 's' : ''}` : ''}.`,
        data: { total, count, range },
      };
    }
    case 'GET_MONTHLY_TOTAL': {
      const { total, count, range } = await sumExpenses(userId, { period: e.period || 'month', date: e.date });
      return {
        intent, confidence: parsed.confidence, provider: parsed.provider, kind: 'result',
        resultText: `Your total for ${range} is ${currencyText(user.defaultCurrency, total)}.`,
        data: { total, count, range },
      };
    }
    case 'GET_CATEGORY_TOTAL': {
      const { total, count, range } = await sumExpenses(userId, { category: e.category, period: e.period || 'month', date: e.date });
      return {
        intent, confidence: parsed.confidence, provider: parsed.provider, kind: 'result',
        resultText: `You spent ${currencyText(user.defaultCurrency, total)} on ${e.category || 'that'} ${range}.`,
        data: { total, count, range, category: e.category },
      };
    }
    case 'GET_EXPENSES': {
      const range = periodRange(e.period || 'week', e.date);
      const rows = await prisma.expense.findMany({
        where: { userId, expenseDate: { gte: range.start, lt: range.end } },
        orderBy: { expenseDate: 'desc' }, take: 20,
      });
      return {
        intent, confidence: parsed.confidence, provider: parsed.provider, kind: 'result',
        resultText: `Here are your recent expenses for ${range.label}:`,
        data: { expenses: rows.map(serializeExpense), range: range.label },
      };
    }
    case 'GET_USER_BALANCE': {
      const allGroups = await prisma.expenseGroup.findMany({
        where: { members: { some: { userId } } },
        include: { members: { include: { user: { select: { id: true, name: true } } } }, expenses: { include: { splits: true } }, settlements: true },
      });
      const summary = allGroups.map((g) => {
        const b = calculateGroupBalances({ expenses: g.expenses, settlements: g.settlements, members: g.members.map((m) => ({ id: m.userId, name: m.user.name })) });
        const me = b.members.find((m) => m.userId === userId);
        return { groupId: g.id, groupName: g.name, net: me?.net || 0, owed: me ? me.owed : 0, paid: me ? me.paid : 0 };
      });
      const netTotal = summary.reduce((a, s) => a + s.net, 0);
      const text = netTotal === 0
        ? 'Your balance is settled everywhere. 🎉'
        : netTotal > 0
          ? `People owe you ${currencyText(user.defaultCurrency, netTotal)} across ${summary.length} group${summary.length === 1 ? '' : 's'}.`
          : `You owe ${currencyText(user.defaultCurrency, -netTotal)} across ${summary.length} group${summary.length === 1 ? '' : 's'}.`;
      return { intent, confidence: parsed.confidence, provider: parsed.provider, kind: 'result', resultText: text, data: { summary, net: netTotal } };
    }
    case 'GET_GROUP_BALANCE': {
      const { group, ambiguous, candidates } = resolveGroupByName(e.groupName, groups);
      if (ambiguous || !group) {
        return clarificationResponse(parsed, 'groupName', `I found ${ambiguous ? 'several' : 'no'} matching group. Which one?`, candidates);
      }
      const detailed = await prisma.expenseGroup.findUnique({
        where: { id: group.id },
        include: { members: { include: { user: { select: { id: true, name: true } } } }, expenses: { include: { splits: true } }, settlements: true },
      });
      const balance = calculateGroupBalances({
        expenses: detailed.expenses,
        settlements: detailed.settlements,
        members: detailed.members.map((m) => ({ id: m.userId, name: m.user.name })),
      });
      const me = balance.members.find((m) => m.userId === userId);
      const text = me
        ? me.net > 0
          ? `In ${group.name}, you are owed ${currencyText(group.defaultCurrency, me.net)}.`
          : me.net < 0
            ? `In ${group.name}, you owe ${currencyText(group.defaultCurrency, -me.net)}.`
            : `You're all settled in ${group.name}.`
        : 'You are not part of this group.';
      return { intent, confidence: parsed.confidence, provider: parsed.provider, kind: 'result', resultText: text, data: { balance } };
    }
    case 'CONVERT_CURRENCY': {
      const from = validateCurrency(e.from || findCurrency(transcript) || 'INR');
      const to = validateCurrency(e.to);
      const amount = toNumber(toMinor(e.amount ?? moneyOut(transcript) ?? 0));
      const conv = await convertAmount(amount, from, to);
      return {
        intent, confidence: parsed.confidence, provider: parsed.provider, kind: 'result',
        resultText: `${currencyText(from, amount)} is ${currencyText(to, conv.baseAmount)} (rate ${conv.exchangeRate}).`,
        data: { amount, from, to, converted: conv.baseAmount, rate: conv.exchangeRate, rateSource: conv.rateSource },
      };
    }
    case 'OPEN_GROUP': {
      const { group, ambiguous, candidates } = resolveGroupByName(e.groupName, groups);
      if (ambiguous || !group) return clarificationResponse(parsed, 'groupName', 'Which group?', candidates);
      return { intent, confidence: parsed.confidence, provider: parsed.provider, kind: 'navigate', route: 'group', params: { groupId: group.id, groupName: group.name }, resultText: `Opening ${group.name}.` };
    }
    case 'OPEN_GROUPS': return { intent, confidence: parsed.confidence, provider: parsed.provider, kind: 'navigate', route: 'groups', params: {}, resultText: 'Opening your groups.' };
    case 'OPEN_EXPENSES': return { intent, confidence: parsed.confidence, provider: parsed.provider, kind: 'navigate', route: 'expenses', params: {}, resultText: 'Opening expenses.' };
    case 'OPEN_REPORTS': return { intent, confidence: parsed.confidence, provider: parsed.provider, kind: 'navigate', route: 'reports', params: {}, resultText: 'Opening reports.' };
    case 'OPEN_SETTINGS': return { intent, confidence: parsed.confidence, provider: parsed.provider, kind: 'navigate', route: 'settings', params: {}, resultText: 'Opening settings.' };
    case 'SCAN_BILL': return { intent, confidence: parsed.confidence, provider: parsed.provider, kind: 'navigate', route: 'scan', params: {}, resultText: 'Opening the bill scanner.' };
    case 'OPEN_DIARY': {
      const totalEntries = await prisma.diaryEntry.count({ where: { userId } });
      const latestEntry = await prisma.diaryEntry.findFirst({
        where: { userId },
        orderBy: { entryDate: 'desc' },
      });

      if (totalEntries === 0) {
        const text = 'Opening your Diary. You have no saved reflections yet. Speak "diary entry" followed by your thoughts to log one!';
        return {
          intent,
          confidence: parsed.confidence,
          provider: parsed.provider,
          kind: 'navigate',
          route: 'diary',
          params: {},
          resultText: text,
          speechText: 'Opening your Diary. You have no saved reflections yet. Ready to write your first reflection?',
          data: { totalEntries: 0 },
        };
      }

      const dateStr = latestEntry.entryDate ? new Date(latestEntry.entryDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'recently';
      const previewTitle = latestEntry.title || latestEntry.content?.slice(0, 30) || 'Journal';
      const resultText = `Opening your Diary. You have ${totalEntries} saved reflection${totalEntries > 1 ? 's' : ''}.\nLatest entry: "${previewTitle}" (${dateStr}).`;
      const speechText = `Opening your Diary. You have ${totalEntries} saved reflection${totalEntries > 1 ? 's' : ''}, with your latest entry "${previewTitle}".`;
      return {
        intent,
        confidence: parsed.confidence,
        provider: parsed.provider,
        kind: 'navigate',
        route: 'diary',
        params: {},
        resultText,
        speechText,
        data: { totalEntries, latestEntry },
      };
    }
    case 'OPEN_FITNESS': return { intent, confidence: parsed.confidence, provider: parsed.provider, kind: 'navigate', route: 'fitness', params: {}, resultText: 'Opening Fitness Journal.' };
    case 'OPEN_WORKOUT_PLANNER': return { intent, confidence: parsed.confidence, provider: parsed.provider, kind: 'navigate', route: 'workout-planner', params: {}, resultText: 'Opening Workout Planner.' };
    case 'OPEN_TODOS': {
      const pendingTodos = await prisma.todo.findMany({
        where: { userId, isCompleted: false },
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        take: 5,
      });
      const totalPending = await prisma.todo.count({
        where: { userId, isCompleted: false },
      });

      if (totalPending === 0) {
        const text = 'Opening your To-Do list. You have no pending tasks. Great job staying organized!';
        return {
          intent,
          confidence: parsed.confidence,
          provider: parsed.provider,
          kind: 'navigate',
          route: 'todo',
          params: {},
          resultText: text,
          speechText: 'You have no pending tasks on your to-do list. Opening your to-do list.',
          data: { totalPending: 0, todos: [] },
        };
      }

      const listBullets = pendingTodos.map((t, idx) => `${idx + 1}. ${t.title}`).join('\n');
      const spokenTitles = pendingTodos.slice(0, 3).map((t) => t.title).join(', ');
      const moreText = totalPending > pendingTodos.length ? ` and ${totalPending - pendingTodos.length} more` : '';

      return {
        intent,
        confidence: parsed.confidence,
        provider: parsed.provider,
        kind: 'navigate',
        route: 'todo',
        params: {},
        resultText: `Opening your To-Do list. You have ${totalPending} pending task${totalPending > 1 ? 's' : ''}:\n${listBullets}`,
        speechText: `You have ${totalPending} pending task${totalPending > 1 ? 's' : ''}: ${spokenTitles}${moreText}. Opening your to-do list.`,
        data: { totalPending, todos: pendingTodos },
      };
    }
    case 'OPEN_BODY_SCAN': return { intent, confidence: parsed.confidence, provider: parsed.provider, kind: 'navigate', route: 'body-scan', params: {}, resultText: 'Opening Body Scan tracker.' };
    case 'OPEN_DASHBOARD': return { intent, confidence: parsed.confidence, provider: parsed.provider, kind: 'navigate', route: 'dashboard', params: {}, resultText: 'Opening Dashboard.' };
    case 'OPEN_AI': return { intent, confidence: parsed.confidence, provider: parsed.provider, kind: 'navigate', route: 'ai', params: {}, resultText: 'Opening AI Assistant.' };
    case 'SCAN_GYM_EQUIPMENT': {
      return {
        intent,
        confidence: parsed.confidence,
        provider: parsed.provider,
        kind: 'navigate',
        route: 'fitness',
        params: { openScanner: true },
        resultText: 'Opening gym equipment scanner. Point your camera at the machine.',
      };
    }
    case 'GET_EQUIPMENT_GUIDE': {
      let eq = null;
      if (e.equipmentName) {
        const match = await matchEquipmentInDb(e.equipmentName);
        eq = match?.equipment;
      }
      if (!eq) {
        const latestScan = await prisma.equipmentScanLog.findFirst({
          where: { userId, status: 'success', equipmentId: { not: null } },
          orderBy: { createdAt: 'desc' },
          include: { equipment: true },
        });
        eq = latestScan?.equipment;
      }
      if (!eq) {
        eq = await prisma.equipment.findFirst({ where: { isActive: true } });
      }

      const howTo = Array.isArray(eq?.instructions) && eq.instructions.length
        ? eq.instructions.slice(0, 2).join(' ')
        : 'Keep your core braced and control the movement.';
      const setup = Array.isArray(eq?.setupInstructions) && eq.setupInstructions.length
        ? eq.setupInstructions[0]
        : 'Adjust seat and pads to your height.';

      return {
        intent,
        confidence: parsed.confidence,
        provider: parsed.provider,
        kind: 'result',
        resultText: `Here is how to adjust and use the ${eq?.name || 'machine'}: ${setup} ${howTo}`,
        data: {
          equipmentId: eq?.id,
          equipmentName: eq?.name,
          instructions: eq?.instructions,
          setupInstructions: eq?.setupInstructions,
          safetyTips: eq?.safetyInstructions,
        },
      };
    }
    case 'GET_MACHINE_EXERCISE': {
      let eq = null;
      if (e.equipmentName) {
        const match = await matchEquipmentInDb(e.equipmentName);
        eq = match?.equipment;
      }

      const targetMuscle = (e.muscle || (eq ? 'all' : 'Legs')).toLowerCase();
      const matchTerms = getMuscleMatchTerms(targetMuscle);

      // If user specified equipment by name, search exercises on that equipment first
      if (eq) {
        const exercises = await prisma.exercise.findMany({
          where: { equipmentId: eq.id, isActive: true },
          include: { equipment: true },
        });
        const matched = exercises.find((ex) => matchesMuscleGroup(ex, matchTerms)) || exercises[0];
        if (matched) {
          const resultText = `For ${targetMuscle} on the ${eq.name}, try ${matched.name} (${matched.recommendedSets || 3} sets × ${matched.recommendedReps || '10-12'}). ${matched.shortDescription || ''}`.trim();
          const speechText = `For ${targetMuscle} on the ${eq.name}, try ${matched.name} for ${matched.recommendedSets || 3} sets of ${matched.recommendedReps || '10 to 12'} reps.`;
          return {
            intent,
            confidence: parsed.confidence,
            provider: parsed.provider,
            kind: 'result',
            route: 'fitness',
            resultText,
            speechText,
            data: { exercise: matched, equipmentName: eq.name },
          };
        }
      }

      // If no equipment specified or machine has no match: query across all exercises in DB!
      const allExercises = await prisma.exercise.findMany({
        where: { isActive: true },
        include: { equipment: true },
        orderBy: { name: 'asc' },
      });

      const matchedList = allExercises.filter((ex) => matchesMuscleGroup(ex, matchTerms));
      const workoutPlan = matchedList.length > 0 ? matchedList.slice(0, 4) : allExercises.slice(0, 4);

      const muscleLabel = targetMuscle.charAt(0).toUpperCase() + targetMuscle.slice(1);
      const exerciseBullets = workoutPlan
        .map((ex, i) => `${i + 1}. ${ex.name} (${ex.recommendedSets || 3} sets × ${ex.recommendedReps || '10-12'}${ex.equipment ? ` • ${ex.equipment.name}` : ''})`)
        .join('\n');

      const spokenExercises = workoutPlan.map((ex) => ex.name).join(', ');
      const resultText = `Recommended ${muscleLabel} Workout Routine:\n${exerciseBullets}\n\nLet's crush this workout!`;
      const speechText = `Here is a great ${muscleLabel} workout routine: ${spokenExercises}. Start with ${workoutPlan[0]?.name || 'the first exercise'}.`;

      return {
        intent,
        confidence: parsed.confidence,
        provider: parsed.provider,
        kind: 'result',
        route: 'workout-planner',
        resultText,
        speechText,
        data: {
          muscle: muscleLabel,
          exercises: workoutPlan,
        },
      };
    }
    case 'ADD_EXERCISE_TO_WORKOUT': {
      let exercise = null;
      if (e.exerciseName) {
        exercise = await prisma.exercise.findFirst({
          where: {
            name: { contains: e.exerciseName, mode: 'insensitive' },
            isActive: true,
          },
        });
      }

      if (!exercise) {
        const latestScan = await prisma.equipmentScanLog.findFirst({
          where: { userId, status: 'success', equipmentId: { not: null } },
          orderBy: { createdAt: 'desc' },
          include: { equipment: { include: { exercises: true } } },
        });
        exercise = latestScan?.equipment?.exercises?.[0];
      }

      if (!exercise) {
        exercise = await prisma.exercise.findFirst({ where: { isActive: true } });
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let workout = await prisma.workout.findFirst({
        where: { userId, workoutDate: today },
        include: { exercises: true },
      });

      if (!workout) {
        workout = await prisma.workout.create({
          data: {
            userId,
            name: `${exercise.primaryMuscle || 'Fitness'} Workout`,
            workoutDate: today,
            status: 'planned',
          },
          include: { exercises: true },
        });
      }

      const createdWorkoutExercise = await prisma.workoutExercise.create({
        data: {
          workoutId: workout.id,
          exerciseId: exercise.id,
          exerciseName: exercise.name,
          sets: exercise.recommendedSets || 3,
          reps: exercise.recommendedReps || '10',
          orderIndex: workout.exercises.length,
        },
      });

      return {
        intent,
        confidence: parsed.confidence,
        provider: parsed.provider,
        kind: 'result',
        resultText: `Added ${exercise.name} (${exercise.recommendedSets || 3} sets × ${exercise.recommendedReps || '10'}) to today's workout!`,
        data: { workoutId: workout.id, workoutExercise: createdWorkoutExercise },
      };
    }
    case 'GET_NEXT_EXERCISE': {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const workout = await prisma.workout.findFirst({
        where: { userId, workoutDate: today },
        include: {
          exercises: {
            orderBy: { orderIndex: 'asc' },
            include: { exercise: true },
          },
        },
      });

      if (!workout || !workout.exercises.length) {
        const plan = await prisma.workoutPlan.findFirst({
          where: { userId, isActive: true },
          include: { days: true },
        });
        const dayNum = new Date().getDay();
        const planDay = plan?.days?.find((d) => d.dayNumber === dayNum);
        const firstEx = Array.isArray(planDay?.exercises) && planDay.exercises[0];

        if (firstEx) {
          return {
            intent,
            confidence: parsed.confidence,
            provider: parsed.provider,
            kind: 'result',
            resultText: `Your planned workout for today is "${planDay.workoutName || 'Workout'}". The first exercise is ${firstEx.name}.`,
            data: { exercise: firstEx },
          };
        }

        return {
          intent,
          confidence: parsed.confidence,
          provider: parsed.provider,
          kind: 'result',
          resultText: 'No exercises found in today\'s workout. You can scan a machine or add exercises from the library!',
          data: {},
        };
      }

      const nextEx = workout.exercises[0];
      return {
        intent,
        confidence: parsed.confidence,
        provider: parsed.provider,
        kind: 'result',
        resultText: `Your next exercise is ${nextEx.exerciseName} (${nextEx.sets || 3} sets × ${nextEx.reps || '10'}${nextEx.weightKg ? ` at ${nextEx.weightKg}kg` : ''}). Let's crush it!`,
        data: { exercise: nextEx },
      };
    }
    default:
      break;
  }

  // ── Multi-Module Write / Contact intents ──
  if (intent === 'CREATE_TODO') {
    const rawTitle = e.title || transcript.replace(/^(?:add\s+(?:a\s+)?(?:task|todo|to-do|to\s+do)|create\s+(?:a\s+)?(?:todo|task|to-do|to\s+do)|remind\s+me\s+to|todo:?|to\s+do:?)\s+/i, '').trim() || 'New Task';
    const cleanTitle = rawTitle.replace(/^["']|["']$/g, '').trim();
    const formattedTitle = cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1);
    const todo = await prisma.todo.create({
      data: {
        userId,
        title: formattedTitle,
        priority: 'medium',
      },
    });
    const msg = `Added "${todo.title}" to your To-Do list.`;
    return {
      intent,
      confidence: 0.95,
      provider: parsed.provider,
      kind: 'result',
      route: 'todo',
      executionMessage: msg,
      resultText: msg,
      speechText: `Added ${todo.title} to your to-do list.`,
      data: { todo },
    };
  }

  if (intent === 'CONTACT_USER') {
    const q = (e.query || '').trim();
    if (!q) return clarificationResponse(parsed, 'query', 'Who would you like to contact or invite?', []);
    const phonePatterns = getPhoneSearchPatterns(q);
    const targetUser = await prisma.user.findFirst({
      where: {
        AND: [
          { id: { not: userId } },
          {
            OR: [
              { phoneNumber: { contains: q, mode: 'insensitive' } },
              { email: { contains: q, mode: 'insensitive' } },
              { name: { contains: q, mode: 'insensitive' } },
              ...phonePatterns.map((p) => ({ phoneNumber: { contains: p } })),
            ],
          },
        ],
      },
    });
    if (targetUser) {
      await notifyUser(targetUser.id, {
        title: 'Connection Alert',
        message: `${user.name} contacted you on Life OS.`,
        type: 'info',
        data: { fromUserId: userId },
      });
      const msg = `Found ${targetUser.name} (${targetUser.phoneNumber || targetUser.email}). Sent an in-app notification to connect!`;
      return {
        intent,
        confidence: 0.9,
        provider: parsed.provider,
        kind: 'result',
        executionMessage: msg,
        resultText: msg,
        speechText: `Found ${targetUser.name} and sent an in-app connection alert.`,
        data: { user: targetUser },
      };
    } else {
      const msg = `No registered user found matching "${q}". You can invite them to Life OS via phone SMS or email!`;
      return {
        intent,
        confidence: 0.8,
        provider: parsed.provider,
        kind: 'result',
        executionMessage: msg,
        resultText: msg,
        speechText: `No registered user found for ${q}. You can invite them via SMS or email.`,
        data: { notFound: true, query: q },
      };
    }
  }

  if (intent === 'LOG_WORKOUT') {
    const name = e.name || 'Workout';
    const durationMin = Number(e.durationMin) || 30;
    const totalCaloriesBurned = Number(e.caloriesBurned) || 200;

    const workout = await prisma.workout.create({
      data: {
        userId,
        name,
        workoutDate: new Date(),
        status: 'completed',
        durationMin,
        totalCaloriesBurned,
      },
    });

    const msg = `Logged workout "${workout.name}" (${workout.durationMin} mins, ${workout.totalCaloriesBurned} kcal).`;
    const speech = `Great job! I've logged your ${workout.name} workout for today with ${workout.totalCaloriesBurned} calories burned.`;
    return {
      intent,
      confidence: 0.95,
      provider: parsed.provider,
      kind: 'result',
      executionMessage: msg,
      resultText: msg,
      speechText: speech,
      data: { workout },
    };
  }

  if (intent === 'LOG_EXERCISE') {
    const exerciseName = e.exerciseName || 'Exercise';
    const sets = Number(e.sets) || 3;
    const reps = String(e.reps || '10');
    const weightKg = e.weightKg ? Number(e.weightKg) : null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let workout = await prisma.workout.findFirst({
      where: { userId, workoutDate: today },
    });
    if (!workout) {
      workout = await prisma.workout.create({
        data: {
          userId,
          name: `${exerciseName} Session`,
          workoutDate: new Date(),
          status: 'completed',
          durationMin: 25,
          totalCaloriesBurned: 150,
        },
      });
    }

    const ex = await prisma.workoutExercise.create({
      data: {
        workoutId: workout.id,
        exerciseName,
        sets,
        reps,
        weightKg,
        orderIndex: 0,
      },
    });

    const msg = `Logged ${sets} sets of ${exerciseName} (${reps} reps${weightKg ? ` @ ${weightKg}kg` : ''}).`;
    const speech = `Logged ${sets} sets of ${exerciseName}. Keep crushing your workout!`;
    return {
      intent,
      confidence: 0.95,
      provider: parsed.provider,
      kind: 'result',
      executionMessage: msg,
      resultText: msg,
      speechText: speech,
      data: { exercise: ex, workout },
    };
  }

  if (intent === 'LOG_DIARY') {
    const rawContent = (e.content || transcript.replace(/^(?:diary\s+entry:?|diary:?|write\s+(?:in\s+)?diary:?|log\s+diary:?)\s*/i, '') || transcript).trim();
    const title = e.title || (rawContent.length > 35 ? rawContent.slice(0, 32) + '...' : rawContent) || 'Voice Reflection';
    const formattedTitle = title.charAt(0).toUpperCase() + title.slice(1);
    const mood = e.mood || 'productive';

    const entry = await prisma.diaryEntry.create({
      data: {
        userId,
        title: formattedTitle,
        content: rawContent,
        mood,
        entryDate: new Date(),
      },
    });

    const msg = `Saved diary reflection "${entry.title}".`;
    const speech = `Your diary reflection "${entry.title}" has been saved.`;
    return {
      intent,
      confidence: 0.95,
      provider: parsed.provider,
      kind: 'result',
      route: 'diary',
      executionMessage: msg,
      resultText: msg,
      speechText: speech,
      data: { diaryEntry: entry },
    };
  }

  if (intent === 'LOG_FOOD') {
    const foodName = e.foodName || 'Meal';
    const mealType = ['breakfast', 'lunch', 'dinner', 'snack'].includes(e.mealType) ? e.mealType : 'snack';
    const calories = Number(e.calories) || 250;

    const food = await prisma.nutritionLog.create({
      data: {
        userId,
        foodName,
        mealType,
        calories,
        logDate: new Date(),
      },
    });

    const msg = `Logged ${foodName} (${calories} kcal, ${mealType}).`;
    const speech = `Logged ${foodName} with ${calories} calories to your nutrition journal.`;
    return {
      intent,
      confidence: 0.95,
      provider: parsed.provider,
      kind: 'result',
      executionMessage: msg,
      resultText: msg,
      speechText: speech,
      data: { foodLog: food },
    };
  }

  // ── Write intents ──
  if (intent === 'CREATE_EXPENSE') return prepareCreateExpense(userId, transcript, parsed, user);
  if (intent === 'CREATE_GROUP_EXPENSE') return prepareCreateGroupExpense(userId, transcript, parsed, user, groups);
  if (intent === 'CREATE_GROUP') return prepareCreateGroup(parsed, user);
  if (intent === 'ADD_GROUP_MEMBER') return prepareAddMember(userId, parsed, groups);
  if (intent === 'CREATE_SETTLEMENT') return prepareSettlement(userId, transcript, parsed, groups);
  if (intent === 'DELETE_EXPENSE') return prepareDeleteExpense(userId, transcript, parsed, user);

  return clarificationResponse(parsed, 'transcript', 'I didn\'t understand that. Could you rephrase, or type it instead?', []);
}

function clarificationResponse(parsed, field, question, options) {
  return {
    intent: parsed.intent,
    confidence: parsed.confidence,
    provider: parsed.provider,
    kind: 'clarification',
    clarification: { question, field, options: options.slice(0, 6) },
  };
}

// ── Write-action builders (each returns a stored pending action) ──────

async function prepareCreateExpense(userId, transcript, parsed, user) {
  const e = parsed.entities || {};
  const amount = toNumber(toMinor(e.amount ?? moneyOut(transcript) ?? 0));
  if (!(amount > 0)) {
    return clarificationResponse(parsed, 'amount', 'How much was the expense?', []);
  }
  const category = EXPENSE_CATEGORIES.includes(e.category) ? e.category : findCategory(transcript) || 'Other';
  const currency = e.currency ? validateCurrency(e.currency) : findCurrency(transcript) || user.defaultCurrency || DEFAULT_CURRENCY;
  const description = e.description || describeFrom(transcript) || 'Expense';
  const date = e.date || null;

  const requiresConfirmation = amount >= LARGE_EXPENSE_THRESHOLD;
  const action = {
    type: 'CREATE_EXPENSE',
    payload: { amount, currency, category, description, date },
    requiresConfirmation,
    confirmationReason: requiresConfirmation ? `The amount (${currencyText(currency, amount)}) is large.` : null,
  };
  const id = storePending(userId, action);
  return {
    intent: parsed.intent, confidence: parsed.confidence, provider: parsed.provider, kind: 'action',
    serverCommandId: id, requiresConfirmation, confirmationReason: action.confirmationReason,
    previewText: `Add ${currencyText(currency, amount)} for ${description}${category !== 'Other' ? ` under ${category}` : ''}${date ? ` on ${date}` : ''}?`,
  };
}

async function prepareCreateGroupExpense(userId, transcript, parsed, user, groups) {
  const e = parsed.entities || {};
  const amount = toNumber(toMinor(e.amount ?? moneyOut(transcript) ?? 0));
  if (!(amount > 0)) return clarificationResponse(parsed, 'amount', 'How much was the expense?', []);

  const { group, ambiguous, candidates } = resolveGroupByName(e.groupName, groups);
  if (ambiguous || !group) {
    return clarificationResponse(parsed, 'groupName', ambiguous ? 'Which group is this expense for?' : 'I couldn\'t find that group. Which one?', candidates);
  }

  const membersIds = resolveMembers(e.members, group, userId);
  let splitMembers;
  if (e.splitType === 'EXACT' && Array.isArray(e.splits)) {
    splitMembers = e.splits;
  } else if (membersIds.length > 0) {
    splitMembers = membersIds.map((id) => ({ userId: id }));
  } else if (e.splitType === 'EQUAL') {
    splitMembers = group.members.map((m) => ({ userId: m.userId }));
  } else {
    return clarificationResponse(parsed, 'members', 'Who should be included in the split?', group.members.map((m) => m.user.name));
  }

  const currency = e.currency ? validateCurrency(e.currency) : findCurrency(transcript) || group.defaultCurrency || DEFAULT_CURRENCY;
  const description = e.description || describeFrom(transcript) || 'Expense';
  const splitType = e.splitType || 'EQUAL';
  const paidById = resolveMembers([e.paidBy === 'CURRENT_USER' ? 'CURRENT_USER' : (e.paidBy || 'CURRENT_USER')], group, userId)[0] || userId;
  const date = e.date || null;

  // Validate the split server-side EARLY (before storing pending).
  const allocations = buildSplits(amount, splitType, splitMembers).map((s) => ({ userId: s.userId, amount: toNumber(s.amountMinor), percentage: s.percentage, shares: s.shares }));

  const requiresConfirmation = amount >= LARGE_EXPENSE_THRESHOLD;
  const action = {
    type: 'CREATE_GROUP_EXPENSE',
    payload: { groupId: group.id, amount, currency, description, date, splitType, paidById, splits: allocations },
    requiresConfirmation,
    confirmationReason: requiresConfirmation ? `The amount (${currencyText(currency, amount)}) is large.` : null,
  };
  const id = storePending(userId, action);
  return {
    intent: parsed.intent, confidence: parsed.confidence, provider: parsed.provider, kind: 'action',
    serverCommandId: id, requiresConfirmation, confirmationReason: action.confirmationReason,
    previewText: `Add ${currencyText(currency, amount)} for ${description} to ${group.name}, split ${splitType.toLowerCase()} between ${splitMembers.length} member(s)?`,
  };
}

async function prepareCreateGroup(parsed, user) {
  const groupName = parsed.entities?.groupName || null;
  const members = await prisma.expenseGroupMember.count({ where: { group: { name: groupName } } });
  // Does a group with the same name already exist? (cheap guard)
  const existing = await prisma.expenseGroup.findFirst({ where: { name: { equals: groupName, mode: 'insensitive' }, members: { some: { userId: user.id } } } });
  if (existing) {
    return clarificationResponse(parsed, 'groupName', `You already have a group called ${existing.name}. Create another one or open it?`, [existing.name]);
  }
  void members;
  if (!groupName) return clarificationResponse(parsed, 'groupName', 'What should the group be called?', []);
  const action = { type: 'CREATE_GROUP', payload: { name: groupName, createdBy: user.id }, requiresConfirmation: false, confirmationReason: null };
  const id = storePending(user.id, action);
  return { intent: parsed.intent, confidence: parsed.confidence, provider: parsed.provider, kind: 'action', serverCommandId: id, requiresConfirmation: false, previewText: `Create group "${groupName}"?` };
}

async function prepareAddMember(userId, parsed, groups) {
  const e = parsed.entities || {};
  const { group, ambiguous, candidates } = resolveGroupByName(e.groupName, groups);
  if (ambiguous || !group) return clarificationResponse(parsed, 'groupName', 'Which group?', candidates);

  const memberName = e.memberName || null;
  if (!memberName) return clarificationResponse(parsed, 'memberName', 'Who should I add?', []);

  const { user: target, ambiguous: amb } = await findUserByNameOrEmail(memberName.toLowerCase());
  if (amb) return clarificationResponse(parsed, 'memberName', 'There are several people with that name — which one?', []);
  if (!target) return clarificationResponse(parsed, 'memberName', `I can't find a user named ${memberName}. Ask them to sign up, then add them by email.`, []);

  const already = group.members.some((m) => m.userId === target.id);
  if (already) {
    return { intent: parsed.intent, confidence: parsed.confidence, provider: parsed.provider, kind: 'result', resultText: `${target.name} is already in ${group.name}.` };
  }

  const action = { type: 'ADD_GROUP_MEMBER', payload: { groupId: group.id, userId: target.id, name: target.name, groupName: group.name }, requiresConfirmation: false, confirmationReason: null };
  const id = storePending(userId, action);
  return { intent: parsed.intent, confidence: parsed.confidence, provider: parsed.provider, kind: 'action', serverCommandId: id, requiresConfirmation: false, previewText: `Add ${target.name} to ${group.name}?` };
}

async function prepareSettlement(userId, transcript, parsed, groups) {
  const e = parsed.entities || {};
  const { group, ambiguous, candidates } = resolveGroupByName(e.groupName, groups);
  if (groups.length === 0) return clarificationResponse(parsed, 'groupName', 'You have no groups yet.', []);
  if (ambiguous || !group) return clarificationResponse(parsed, 'groupName', 'Which group is this settlement for?', candidates);

  const memberName = e.memberName || transcript.match(/([A-Za-z]+)'s\s/)?.[1];
  const member = group.members.find((m) => m.user.name.toLowerCase() === String(memberName || '').toLowerCase());
  if (!member) return clarificationResponse(parsed, 'memberName', 'Who paid you? (name them)', group.members.map((m) => m.user.name));

  const amount = toNumber(toMinor(e.amount ?? moneyOut(transcript) ?? 0));
  if (!(amount > 0)) return clarificationResponse(parsed, 'amount', `How much did ${member.user.name} pay you?`, []);

  const action = {
    type: 'CREATE_SETTLEMENT',
    payload: { groupId: group.id, fromUserId: member.userId, toUserId: userId, groupName: group.name, memberName: member.user.name, amount, currency: e.currency || group.defaultCurrency || DEFAULT_CURRENCY },
    requiresConfirmation: true,
    confirmationReason: 'Settlements update who owes whom.',
  };
  const id = storePending(userId, action);
  return {
    intent: parsed.intent, confidence: parsed.confidence, provider: parsed.provider, kind: 'action',
    serverCommandId: id, requiresConfirmation: true, confirmationReason: action.confirmationReason,
    previewText: `Mark ${currencyText(action.payload.currency, amount)} paid by ${member.user.name} to you in ${group.name}?`,
  };
}

async function prepareDeleteExpense(userId, transcript, parsed, user) {
  const e = parsed.entities || {};
  const amount = e.amount ?? moneyOut(transcript);
  const category = e.category || findCategory(transcript);
  const description = e.description || describeFrom(transcript);

  const where = { userId };
  if (amount) {
    const target = toMinor(amount);
    const all = await prisma.expense.findMany({ where: { userId }, select: { id: true, amount: true } });
    const ids = all.filter((x) => toMinor(x.amount) === target).map((x) => x.id);
    if (ids.length) where.id = { in: ids };
    else return clarificationResponse(parsed, 'expense', `I couldn't find an expense of exactly ${currencyText('INR', amount)}.`, []);
  }
  if (category) where.category = category;
  if (description) where.description = { contains: description, mode: 'insensitive' };

  const matches = await prisma.expense.findMany({ where, orderBy: { expenseDate: 'desc' }, take: 4 });
  if (matches.length === 0) return clarificationResponse(parsed, 'expense', 'I couldn\'t find a matching expense to delete.', []);
  if (matches.length > 1) {
    return clarificationResponse(parsed, 'expense', 'I found several matching expenses — which one?', matches.map((m) => `${m.title} • ${currencyText('INR', toNumber(m.amount))} • ${String(m.expenseDate).slice(0, 10)}`));
  }

  const [target] = matches;
  const action = { type: 'DELETE_EXPENSE', payload: { expenseId: target.id, summary: `${target.title} • ${currencyText('INR', toNumber(target.amount))} • ${String(target.expenseDate).slice(0, 10)}` }, requiresConfirmation: true, confirmationReason: 'Deleting is permanent.' };
  const id = storePending(userId, action);
  return {
    intent: parsed.intent, confidence: parsed.confidence, provider: parsed.provider, kind: 'action',
    serverCommandId: id, requiresConfirmation: true, confirmationReason: action.confirmationReason,
    previewText: `Delete "${target.title}" (${currencyText('INR', toNumber(target.amount))})?`,
  };
}

// ── Execution (Node authority) ────────────────────────────────────────

async function executePending(serverCommandId, userId, { confirmed = false } = {}) {
  const pending = loadPending(serverCommandId);
  if (pending.userId !== userId) throw new Error('This command belongs to a different user.');

  const { action } = pending;
  if (action.requiresConfirmation && !confirmed) {
    throw new Error('This action requires confirmation.');
  }

  let result;
  switch (action.type) {
    case 'CREATE_EXPENSE': {
      const expense = await createExpense(userId, {
        ...action.payload,
        title: action.payload.description,
        source: 'VOICE',
        idempotencyKey: `voice-${pending.id}`,
      });
      result = `Added ${currencyText(expense.currency, toNumber(expense.amount))} ${expense.category} expense.`;
      break;
    }
    case 'CREATE_GROUP_EXPENSE': {
      const expense = await createExpense(userId, {
        ...action.payload,
        title: action.payload.description,
        source: 'VOICE',
        idempotencyKey: `voice-${pending.id}`,
      });
      result = `Added ${currencyText(expense.currency, toNumber(expense.amount))} to the group.`;
      break;
    }
    case 'CREATE_GROUP': {
      const group = await prisma.expenseGroup.create({
        data: {
          name: action.payload.name,
          description: null,
          createdBy: action.payload.createdBy,
          defaultCurrency: DEFAULT_CURRENCY,
          members: { create: { userId: action.payload.createdBy, role: 'owner' } },
        },
      });
      result = `Created group "${group.name}".`;
      break;
    }
    case 'ADD_GROUP_MEMBER': {
      await prisma.expenseGroupMember.create({
        data: { groupId: action.payload.groupId, userId: action.payload.userId, role: 'member' },
      });
      result = `Added ${action.payload.name} to ${action.payload.groupName}.`;
      break;
    }
    case 'CREATE_SETTLEMENT': {
      const s = action.payload;
      await prisma.expenseSettlement.create({
        data: {
          groupId: s.groupId,
          fromUserId: s.fromUserId,
          toUserId: s.toUserId,
          amount: s.amount,
          currency: s.currency,
          note: `Voice settlement`,
        },
      });
      result = `Marked ${currencyText(s.currency, s.amount)} paid by ${s.memberName} to you.`;
      break;
    }
    case 'DELETE_EXPENSE': {
      const owned = await prisma.expense.findFirst({ where: { id: action.payload.expenseId, userId } });
      if (!owned) throw new Error('Expense not found');
      await prisma.expense.delete({ where: { id: action.payload.expenseId } });
      result = `Deleted "${owned.title}".`;
      break;
    }
    default:
      throw new Error(`Unsupported action type: ${action.type}`);
  }

  pendingStore.delete(serverCommandId);
  return result;
}

function currencyText(currency, amount) {
  const symbol = require('../utils/constants').CURRENCIES[currency]?.symbol || '';
  const value = toNumber(toMinor(amount));
  return `${symbol}${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

module.exports = { processVoiceCommand, executePending, loadPending, pendingStore, periodRange, currencyText };