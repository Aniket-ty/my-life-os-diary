// Deterministic natural-language parser used as a provider fallback and for
// tests. It understands the documented voice examples without calling any LLM.
// It returns the exact same contract as the AI providers.

const { normaliseIntent } = require('./contracts');
const { parseDateExpression, parseAmountExpression } = require('../../utils/dates');

const CATEGORY_ALIASES = {
  food: 'Food', lunch: 'Food', dinner: 'Food', breakfast: 'Food', snack: 'Food',
  transport: 'Transport', cab: 'Transport', taxi: 'Transport', uber: 'Transport', ola: 'Transport', fuel: 'Transport', petrol: 'Transport', metro: 'Transport', bus: 'Transport',
  shopping: 'Shopping', groceries: 'Groceries', grocery: 'Groceries',
  bills: 'Bills', bill: 'Bills', electricity: 'Bills', wifi: 'Bills', rent: 'Rent',
  entertainment: 'Entertainment', movies: 'Entertainment', tickets: 'Entertainment',
  health: 'Health', medicine: 'Health', medical: 'Health',
  fitness: 'Fitness', gym: 'Fitness',
  education: 'Education', course: 'Education', fees: 'Education',
  travel: 'Travel', trip: 'Travel',
  coffee: 'Food', tea: 'Food', drink: 'Food', drinks: 'Food', pizza: 'Food', burger: 'Food', hotel: 'Other',
};

const CURRENCY_ALIASES = {
  rupees: 'INR', rupee: 'INR', inr: 'INR', rs: 'INR', 'rs.': 'INR',
  dollars: 'USD', dollar: 'USD', usd: 'USD', '$': 'USD', '$ ': 'USD',
  euros: 'EUR', euro: 'EUR', eur: 'EUR',
  pounds: 'GBP', pound: 'GBP', gbp: 'GBP',
  dirhams: 'AED', dirham: 'AED', aed: 'AED',
  yen: 'JPY', jpy: 'JPY',
  'canadian dollars': 'CAD', cad: 'CAD',
  'australian dollars': 'AUD', aud: 'AUD',
  'singapore dollars': 'SGD', sgd: 'SGD',
};

function findCategory(text) {
  const lower = ` ${text.toLowerCase()} `;
  for (const [key, cat] of Object.entries(CATEGORY_ALIASES)) {
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (new RegExp(`\\b${escaped}\\b`).test(lower)) return cat;
  }
  return null;
}

function findCurrency(text) {
  // Symbol-led amounts: ₹500 / $20 / €100 / £50 / ¥300
  const m = text.match(/([₹$€£¥])\s*(\d+(?:\.\d{1,2})?)/);
  if (m) {
    const sym = m[1];
    if (sym === '₹') return 'INR';
    if (sym === '$') return 'USD';
    if (sym === '€') return 'EUR';
    if (sym === '£') return 'GBP';
    if (sym === '¥') return 'JPY';
  }
  const lower = text.toLowerCase();
  for (const [key, code] of Object.entries(CURRENCY_ALIASES)) {
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (key === '$') continue; // symbol handled above
    if (new RegExp(`\\b${escaped}\\b`).test(lower)) return code;
  }
  return null;
}

function findDescription(text) {
  const lower = text.toLowerCase();
  // After "on <thing>" or "for <thing>" — used as the description.
  const m = lower.match(/\b(?:on|for|at|at the)\s+([a-z][a-z0-9 ]{1,40})$/);
  if (m) return titleCase(m[1].trim()).slice(0, 60);
  // First category-ish noun phrase: "spent 500 rupees on lunch"
  const m2 = lower.match(/\bon\s+([a-z][a-z0-9 ]{1,40})/);
  if (m2) return titleCase(m2[1].trim()).slice(0, 60);
  return null;
}

function titleCase(str) {
  return str
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ');
}

function getPeriod(str, now = new Date()) {
  const lower = str.toLowerCase();
  if (/\btoday\b|\btonight\b/.test(lower)) return { range: 'today', date: parseDateExpression('today', now) };
  if (/\byesterday\b/.test(lower)) return { range: 'yesterday', date: parseDateExpression('yesterday', now) };
  if (/\blast\s+week\b/.test(lower)) return { range: 'lastWeek', date: null };
  if (/\bthis\s+week\b/.test(lower)) return { range: 'week', date: null };
  if (/\blast\s+month\b/.test(lower)) return { range: 'lastMonth', date: null };
  if (/\bthis\s+month\b/.test(lower)) return { range: 'month', date: null };
  return { range: null, date: null };
}

function extractGroupName(text) {
  const lower = text.toLowerCase();
  let m = lower.match(/(?:group called|group named|group)\s+["']?([a-z0-9 ]{2,40})["']?/);
  if (m && !/\b(expense|member|split)\b/.test(m[1])) return titleCase(m[1].trim());
  return null;
}

function extractMemberNames(text, meName) {
  const lower = text.toLowerCase().replace(/[.,;]/g, '');
  const members = [];
  const mePattern = new RegExp(`\\b(${escapeRx(meName)}\\b|me\\b|i\\b)`, 'i');
  const splitIdx = lower.search(/\bsplit\b|\bdivided\b|\bsplitting\b/);
  const betweenIdx = lower.search(/\bbetween\b|\bamong\b|\bamongst\b|\bwith\b/);
  const from = Math.max(splitIdx, betweenIdx);
  let segment = lower;
  if (from >= 0) segment = lower.slice(from);
  if (mePattern.test(segment) && !members.includes('CURRENT_USER')) members.push('CURRENT_USER');
  // Pull out named tokens from the segment that are not stop-words.
  const stop = new Set(['and', 'equally', 'between', 'among', 'amongst', 'with', 'split', 'me', 'the', 'expense', 'paid', 'i', 'for', 'on']);
  const words = segment.split(/\s+/).filter((w) => w && !stop.has(w) && /^[a-z][a-z']{2,20}$/.test(w));
  const known = new Set(['rahul', 'aman', 'rohit', 'aniket', 'sara', 'priya', 'john', 'jane', 'mike', 'alice', 'bob', meName.toLowerCase()]);
  for (const w of words) {
    if (known.has(w.toLowerCase()) && !members.includes(w) && w.toLowerCase() !== meName.toLowerCase()) {
      members.push(String(w[0].toUpperCase() + w.slice(1)));
    }
  }
  return members;
}

function escapeRx(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseSplitInfo(text) {
  const lower = text.toLowerCase();
  if (/percentage|percent|\d+\s*%/.test(lower)) return { splitType: 'PERCENTAGE', members: null };
  if (/equally|equal share|equally split|\bsplit\b/.test(lower)) return { splitType: 'EQUAL', members: null };
  return { splitType: 'EQUAL', members: null };
}

function createExpenseEntities(text, now) {
  const entities = {};
  const amount = parseAmountExpression(text);
  if (amount) entities.amount = Number(amount);
  const currency = findCurrency(text);
  if (currency) entities.currency = currency;
  const category = findCategory(text);
  if (category) entities.category = category;
  const desc = findDescription(text);
  if (desc) entities.description = desc;
  const period = getPeriod(text, now);
  if (period.date) entities.date = period.date;
  if (period.range) entities.period = period.range;
  return entities;
}

/**
 * Parse free text into the AI contract. Always returns a valid shape.
 * @param {string} text
 * @param {object} context { now?: Date, meName?: string, groups?: [{id,name}] }
 */
function parseCommandHeuristic(text, context = {}) {
  const now = context.now || new Date();
  const meName = context.meName || '';
  const lower = text.toLowerCase();
  const clean = lower.replace(/[.,;:!?]/g, ' ').replace(/\s+/g, ' ').trim();

  // ---- Conversions ----
  let m = clean.match(/(?:convert|how much is|exchange)\s+(\d+(?:\.\d{1,2})?)\s*([a-z$₹€£¥]+)\s+(?:to|in|into)\s+([a-z$₹€£¥]+)/);
  if (m) {
    return {
      intent: 'CONVERT_CURRENCY',
      confidence: 0.9,
      entities: { amount: Number(m[1]), from: codeFromWord(m[2]), to: codeFromWord(m[3]) },
      clarification: null,
    };
  }

  // ---- Multi-Module Navigation ----
  if (/(open|write|my|show)\s+(diary|journal)/.test(clean)) return { intent: 'OPEN_DIARY', confidence: 0.95, entities: {}, clarification: null };
  if (/(open|show|my)\s+(fitness|workout|workouts|gym)/.test(clean)) return { intent: 'OPEN_FITNESS', confidence: 0.95, entities: {}, clarification: null };
  if (/(open|show)\s+(workout\s+planner|planner|workout\s+plan)/.test(clean)) return { intent: 'OPEN_WORKOUT_PLANNER', confidence: 0.95, entities: {}, clarification: null };
  if (/(open|show|my)\s+(todo|todos|tasks|task|to-do)/.test(clean)) return { intent: 'OPEN_TODOS', confidence: 0.95, entities: {}, clarification: null };
  if (/(open|show)\s+(body\s+scan|scan\s+body|composition)/.test(clean)) return { intent: 'OPEN_BODY_SCAN', confidence: 0.95, entities: {}, clarification: null };
  if (/(open|go\s+to)\s+(dashboard|home)/.test(clean)) return { intent: 'OPEN_DASHBOARD', confidence: 0.95, entities: {}, clarification: null };
  if (/(open|chat\s+with|ask)\s+(ai|assistant|ai\s+chat)/.test(clean)) return { intent: 'OPEN_AI', confidence: 0.95, entities: {}, clarification: null };
  if (/(scan\s+bill|scan\s+receipt)/.test(clean)) return { intent: 'SCAN_BILL', confidence: 0.95, entities: {}, clarification: null };

  // ── Gym Equipment & Exercise Voice Intents ──────────────────
  if (/(what\s+machine\s+is\s+this|what\s+is\s+this\s+machine|identify\s+(this\s+)?(machine|equipment)|scan\s+(gym\s+)?(machine|equipment))/i.test(clean)) {
    return { intent: 'SCAN_GYM_EQUIPMENT', confidence: 0.95, entities: {}, clarification: null };
  }

  if (/how\s+(do\s+i\s+)?(use|adjust)\s+(this\s+|the\s+)?(machine|equipment)?/i.test(clean) || /how\s+to\s+use\s+/i.test(clean)) {
    const eqMatch = clean.match(/(?:use|adjust|on)\s+(?:the\s+|this\s+)?([a-z\s]+?)(?:\s+machine|\s+equipment|$)/i);
    const equipmentName = eqMatch && !['this', 'the', 'a', 'an', ''].includes(eqMatch[1].trim()) ? titleCase(eqMatch[1].trim()) : null;
    return { intent: 'GET_EQUIPMENT_GUIDE', confidence: 0.9, entities: { equipmentName }, clarification: null };
  }

  if (/(?:show\s+(?:me\s+)?(?:an\s+)?exercise\s+for|exercises?\s+for)\s+([a-z]+)/i.test(clean)) {
    const match = clean.match(/(?:show\s+(?:me\s+)?(?:an\s+)?exercise\s+for|exercises?\s+for)\s+([a-z]+)(?:\s+(?:using|on)\s+(?:this|the)?\s*([a-z\s]*))?/i);
    const muscle = match?.[1] ? titleCase(match[1]) : 'Chest';
    const rawEq = match?.[2] ? match[2].replace(/\s*(machine|equipment)$/i, '').trim() : '';
    const eqName = rawEq && !['this', 'the', 'a', 'an'].includes(rawEq) ? titleCase(rawEq) : null;
    return { intent: 'GET_MACHINE_EXERCISE', confidence: 0.9, entities: { muscle, equipmentName: eqName }, clarification: null };
  }

  if (/add\s+(?:this\s+exercise|([a-z\s]+?))\s+to\s+(?:today['’]s\s+)?workout/i.test(clean)) {
    const match = clean.match(/add\s+(?:this\s+exercise|([a-z\s]+?))\s+to\s+(?:today['’]s\s+)?workout/i);
    const rawEx = match?.[1] ? match[1].trim() : '';
    const exName = rawEx && !['this', 'the', 'this exercise'].includes(rawEx) ? titleCase(rawEx) : null;
    return { intent: 'ADD_EXERCISE_TO_WORKOUT', confidence: 0.9, entities: { exerciseName: exName }, clarification: null };
  }

  if (/(?:give\s+me\s+the\s+next\s+exercise|what(?:'s|\s+is)\s+the\s+next\s+exercise|next\s+exercise|start\s+(?:this\s+)?exercise)/i.test(clean)) {
    return { intent: 'GET_NEXT_EXERCISE', confidence: 0.95, entities: {}, clarification: null };
  }

  // Multi-Module Task & Contact Actions
  if (/^(add\s+(a\s+)?task|create\s+(a\s+)?todo|remind\s+me\s+to)\b/.test(clean)) {
    const title = clean.replace(/^(add\s+(a\s+)?task|create\s+(a\s+)?todo|remind\s+me\s+to)\s+/i, '').trim();
    return { intent: 'CREATE_TODO', confidence: 0.9, entities: { title: titleCase(title) }, clarification: null };
  }
  if (/^(contact|invite|search\s+user|search\s+friend|find\s+friend)\b/.test(clean)) {
    const query = clean.replace(/^(contact|invite|search\s+user|search\s+friend|find\s+friend)\s+/i, '').trim();
    return { intent: 'CONTACT_USER', confidence: 0.85, entities: { query }, clarification: null };
  }

  // Multi-Module Diary Logging
  if (/^(?:write\s+(?:a\s+)?diary|log\s+(?:a\s+)?diary|save\s+(?:a\s+)?diary|new\s+diary|diary)\b/i.test(clean) && !/^(?:open|show|go to)\b/i.test(clean)) {
    const rawContent = clean.replace(/^(?:write\s+(?:a\s+)?diary(?:\s+entry)?|log\s+(?:a\s+)?diary(?:\s+entry)?|save\s+(?:a\s+)?diary(?:\s+(?:note|entry))?|new\s+diary(?:\s+entry)?|diary)\s*/i, '').trim();
    let mood = 'productive';
    if (/\b(happy|great|awesome|joy|excited)\b/i.test(rawContent)) mood = 'happy';
    else if (/\b(tired|exhausted|sleepy)\b/i.test(rawContent)) mood = 'tired';
    else if (/\b(calm|peaceful|relaxed)\b/i.test(rawContent)) mood = 'calm';
    else if (/\b(motivated|inspired|focused)\b/i.test(rawContent)) mood = 'motivated';

    return {
      intent: 'LOG_DIARY',
      confidence: 0.9,
      entities: {
        content: rawContent || 'Reflected on today.',
        title: titleCase(rawContent.slice(0, 30)) || 'Voice Reflection',
        mood,
      },
      clarification: null,
    };
  }

  // Multi-Module Workout & Exercise Logging
  if (/(?:log\s+exercise|i\s+did\s+\d+\s+sets|bench\s+press|squats?|deadlift|pushups?|pullups?)/i.test(clean) && /(?:sets?|reps?|kg|lbs?)/i.test(clean)) {
    const setsMatch = clean.match(/(\d+)\s*sets?/i);
    const repsMatch = clean.match(/(\d+)\s*reps?/i);
    const weightMatch = clean.match(/(\d+(?:\.\d+)?)\s*(?:kg|kilos|pounds|lbs)/i);
    let exName = 'Exercise';
    if (/bench\s*press/i.test(clean)) exName = 'Bench Press';
    else if (/squats?/i.test(clean)) exName = 'Squats';
    else if (/deadlift/i.test(clean)) exName = 'Deadlift';
    else if (/pushups?/i.test(clean)) exName = 'Pushups';
    else if (/pullups?/i.test(clean)) exName = 'Pullups';
    else if (/bicep\s*curls?/i.test(clean)) exName = 'Bicep Curls';
    else if (/shoulder\s*press/i.test(clean)) exName = 'Shoulder Press';
    else {
      const exClean = clean.replace(/^(?:log\s+exercise|i\s+did)\s+/i, '').split(/\b(?:\d+\s*sets|\d+\s*reps|\d+\s*kg)\b/i)[0].trim();
      if (exClean) exName = titleCase(exClean);
    }

    return {
      intent: 'LOG_EXERCISE',
      confidence: 0.9,
      entities: {
        exerciseName: exName,
        sets: setsMatch ? Number(setsMatch[1]) : 3,
        reps: repsMatch ? Number(repsMatch[1]) : 10,
        weightKg: weightMatch ? Number(weightMatch[1]) : null,
      },
      clarification: null,
    };
  }

  if (/(?:log\s+workout|i\s+(?:ran|walked|worked\s+out)|workout\s+completed|finished\s+workout)/i.test(clean)) {
    const durationMatch = clean.match(/(\d+)\s*(?:minutes?|mins?|min\b)/i);
    const calMatch = clean.match(/(\d+)\s*(?:calories?|cals?|kcal)/i);
    let wName = 'Workout';
    if (/chest/i.test(clean)) wName = 'Chest Day';
    else if (/leg/i.test(clean)) wName = 'Leg Day';
    else if (/back|pull/i.test(clean)) wName = 'Back & Pull Day';
    else if (/arm|bicep|tricep/i.test(clean)) wName = 'Arms Workout';
    else if (/shoulder/i.test(clean)) wName = 'Shoulders Day';
    else if (/cardio|run|running/i.test(clean)) wName = 'Cardio Run';
    else if (/hiit/i.test(clean)) wName = 'HIIT Session';
    else {
      const rawW = clean.replace(/^(?:log\s+workout|finished\s+workout)\s+/i, '').split(/\b(?:\d+\s*min|\d+\s*cal)\b/i)[0].trim();
      if (rawW) wName = titleCase(rawW);
    }

    return {
      intent: 'LOG_WORKOUT',
      confidence: 0.9,
      entities: {
        name: wName,
        durationMin: durationMatch ? Number(durationMatch[1]) : 30,
        caloriesBurned: calMatch ? Number(calMatch[1]) : 200,
      },
      clarification: null,
    };
  }

  // Multi-Module Food Logging
  if (/^(?:log\s+(?:food|meal|breakfast|lunch|dinner|snack)|i\s+ate)\b/i.test(clean)) {
    const calMatch = clean.match(/(\d+)\s*(?:calories?|cals?|kcal)/i);
    let mealType = 'snack';
    if (/breakfast/i.test(clean)) mealType = 'breakfast';
    else if (/lunch/i.test(clean)) mealType = 'lunch';
    else if (/dinner/i.test(clean)) mealType = 'dinner';

    let foodName = clean
      .replace(/^(?:log\s+(?:food|meal|breakfast|lunch|dinner|snack)|i\s+ate)\s+/i, '')
      .replace(/\b(?:for\s+(?:breakfast|lunch|dinner|snack))\b/i, '')
      .split(/\b\d+\s*(?:calories?|cals?|kcal)\b/i)[0]
      .trim();

    return {
      intent: 'LOG_FOOD',
      confidence: 0.9,
      entities: {
        foodName: titleCase(foodName) || 'Meal',
        mealType,
        calories: calMatch ? Number(calMatch[1]) : 250,
      },
      clarification: null,
    };
  }

  // ---- Queries ----
  if (/\bopen\b|\bshow\b|\bgo to\b|\bnavigate\b/.test(clean) && /\bgroup\b|\btrip\b/.test(clean)) {
    const gname = extractGroupName(clean) || clean.split(' open ')[1]?.trim();
    return { intent: 'OPEN_GROUP', confidence: 0.85, entities: { groupName: gname }, clarification: null };
  }
  if (/open (expenses|all expenses)/.test(clean)) return { intent: 'OPEN_EXPENSES', confidence: 0.95, entities: {}, clarification: null };
  if (/open (reports|report)/.test(clean)) return { intent: 'OPEN_REPORTS', confidence: 0.95, entities: {}, clarification: null };
  if (/open (settings|setup)/.test(clean)) return { intent: 'OPEN_SETTINGS', confidence: 0.95, entities: {}, clarification: null };
  if (/open (groups)/.test(clean)) return { intent: 'OPEN_GROUPS', confidence: 0.95, entities: {}, clarification: null };

  if (/how much (did|do|does).*spend|spent this month|spent in .*month/.test(clean)) {
    const period = getPeriod(clean, now);
    const cat = findCategory(clean);
    if (cat || /\b(food|transport|shopping|bills|entertainment|health|fitness|education|travel|groceries|rent)\b/.test(clean)) {
      return { intent: 'GET_CATEGORY_TOTAL', confidence: 0.85, entities: { category: cat || 'Other', period: period.range || 'month' }, clarification: null };
    }
    return { intent: 'GET_MONTHLY_TOTAL', confidence: 0.8, entities: { period: period.range || 'month' }, clarification: null };
  }
  if (/how much (did|do) i spend/.test(clean)) {
    const period = getPeriod(clean, now);
    return { intent: period && /yesterday/.test(clean) ? 'GET_EXPENSES' : 'GET_DAILY_TOTAL', confidence: 0.7, entities: { period: period.range || 'today' }, clarification: null };
  }
  if (/how much (did|do) i spend|spent (today|yesterday|this week|this month|last week|last month)/.test(clean)) {
    const period = getPeriod(clean, now);
    const day = period?.date || parseDateExpression(period?.range === 'week' ? 'today' : 'today', now);
    return {
      intent: period?.range === 'month' || period?.range === 'lastMonth' ? 'GET_MONTHLY_TOTAL' : 'GET_DAILY_TOTAL',
      confidence: 0.75,
      entities: { date: day, period: period?.range || 'today' },
      clarification: null,
    };
  }
  if (/(?:does\s+([a-z]+)\s+owe\s+me|how\s+much\s+([a-z]+)\s+owes?\s+me|([a-z]+)\s+owes?\s+me)/.test(clean)) {
    const m = clean.match(/(?:does\s+([a-z]+)\s+owe\s+me|how\s+much\s+([a-z]+)\s+owes?\s+me|([a-z]+)\s+owes?\s+me)/);
    const memberName = (m[1] || m[2] || m[3] || '').trim();
    const capName = memberName ? memberName.charAt(0).toUpperCase() + memberName.slice(1) : undefined;
    return { intent: 'GET_USER_BALANCE', confidence: 0.85, entities: { memberName: capName }, clarification: null };
  }
  if (/do i owe\s+([a-z]+)|i owe\s+([a-z]+)/.test(clean)) {
    const m = clean.match(/(?:do i owe|i owe)\s+([a-z]+)/);
    const memberName = (m[1] || m[2] || '').trim();
    const capName = memberName ? memberName.charAt(0).toUpperCase() + memberName.slice(1) : undefined;
    return { intent: 'GET_USER_BALANCE', confidence: 0.85, entities: { memberName: capName }, clarification: null };
  }
  if (/owe me|\bowed\b|owes me/.test(clean)) return { intent: 'GET_USER_BALANCE', confidence: 0.8, entities: {}, clarification: null };
  if (/do i owe|i owe/.test(clean)) return { intent: 'GET_USER_BALANCE', confidence: 0.8, entities: {}, clarification: null };
  if (/(group|trip).*(owe|balance)/.test(clean)) return { intent: 'GET_GROUP_BALANCE', confidence: 0.8, entities: {}, clarification: null };

  // ---- Groups ----
  if (/create a group|make a group|new group/.test(clean)) {
    const gname = extractGroupName(clean);
    return { intent: 'CREATE_GROUP', confidence: 0.85, entities: { groupName: gname }, clarification: gname ? null : { question: 'What do you want to name the group?', field: 'groupName', options: [] } };
  }
  if (/add .* to .*(group|trip)/.test(clean)) {
    const person = clean.match(/add\s+([a-z]+)\s+to/);
    const gname = extractGroupName(clean);
    return {
      intent: 'ADD_GROUP_MEMBER',
      confidence: 0.8,
      entities: { memberName: person?.[1] ? titleCase(person[1]) : null, groupName: gname },
      clarification: person && gname ? null : { question: 'Which member and which group?', field: 'addMember', options: [] },
    };
  }

  // ---- Expense creation (group vs personal) ----
  const hasGroup = /(to|in|into|for)\s+the?\s+[a-z0-9 ]*(group|trip)/.test(clean) || (extractGroupName(clean) != null && /\b(group|trip)\b/.test(clean));
  const amount = parseAmountExpression(clean);
  const paidByMe = /i paid|i covered|i'll pay/.test(clean);

  if (/(add|spent|spend|spend|paid|booked|bought)\b/.test(clean) && amount) {
    const baseEntities = createExpenseEntities(clean, now);
    if (hasGroup) {
      const gname = extractGroupName(clean);
      const splitInfo = parseSplitInfo(clean);
      const members = extractMemberNames(clean, meName);
      const entities = {
        groupName: gname,
        amount: baseEntities.amount,
        currency: baseEntities.currency || null,
        description: baseEntities.description || findDescription(clean),
        date: baseEntities.date || null,
        paidBy: paidByMe ? 'CURRENT_USER' : 'CURRENT_USER',
        splitType: splitInfo.splitType,
        members: members.length ? members : ['CURRENT_USER'],
      };
      return { intent: 'CREATE_GROUP_EXPENSE', confidence: 0.75, entities, clarification: gname ? null : { question: 'Which group should this expense go to?', field: 'groupName', options: [] } };
    }
    return { intent: 'CREATE_EXPENSE', confidence: 0.8, entities: { ...baseEntities, description: baseEntities.description || findDescription(clean) }, clarification: null };
  }

  // ---- Settlement ----
  if (/mark .* paid|paid|settled|settle/.test(clean) && !amount) {
    const person = clean.match(/([a-z]+)['\u2019]s/);
    return {
      intent: 'CREATE_SETTLEMENT',
      confidence: 0.7,
      entities: { memberName: person?.[1] ? titleCase(person[1]) : null, amount: null },
      clarification: { question: 'Who paid you and how much?', field: 'settlement', options: [] },
    };
  }
  if (/mark .* paid|paid .* rupees|paid .* rs/.test(clean) && amount) {
    const person = clean.match(/([a-z]+)['\u2019]s/);
    return { intent: 'CREATE_SETTLEMENT', confidence: 0.8, entities: { memberName: person?.[1] ? titleCase(person[1]) : null, amount: Number(amount) }, clarification: null };
  }

  // ---- Delete ----
  if (/delete|remove/.test(clean) && /\bexpense\b/.test(clean)) {
    const delEntities = createExpenseEntities(clean, now);
    return { intent: 'DELETE_EXPENSE', confidence: 0.7, entities: delEntities, clarification: delEntities.amount || delEntities.category ? null : { question: 'Which expense should I delete?', field: 'expense', options: [] } };
  }

  return { intent: null, confidence: 0.1, entities: {}, clarification: { question: 'I didn\'t catch that. Could you rephrase it?', field: 'transcript', options: [] } };
}

function codeFromWord(word) {
  const w = String(word).toLowerCase().replace(/[^a-z]/g, '');
  return CURRENCY_ALIASES[w] || w.toUpperCase();
}

module.exports = {
  parseCommandHeuristic,
  findCategory,
  findCurrency,
  extractMemberNames,
  parseSplitInfo,
  extractGroupName,
};