// AI contracts — the single shape every provider (Python, Groq, local
// heuristic) must return so Node can stay provider-agnostic.
// Invalid or unsafe output from any provider is rejected here.

const VOICE_INTENTS = [
  'CREATE_EXPENSE',
  'UPDATE_EXPENSE',
  'DELETE_EXPENSE',
  'GET_EXPENSES',
  'GET_DAILY_TOTAL',
  'GET_MONTHLY_TOTAL',
  'GET_CATEGORY_TOTAL',
  'CREATE_GROUP',
  'ADD_GROUP_MEMBER',
  'CREATE_GROUP_EXPENSE',
  'GET_GROUP_BALANCE',
  'GET_USER_BALANCE',
  'CREATE_SETTLEMENT',
  'OPEN_GROUP',
  'OPEN_GROUPS',
  'OPEN_EXPENSES',
  'OPEN_REPORTS',
  'OPEN_SETTINGS',
  'SCAN_BILL',
  'CONVERT_CURRENCY',
  'OPEN_DIARY',
  'OPEN_FITNESS',
  'OPEN_WORKOUT_PLANNER',
  'OPEN_TODOS',
  'OPEN_BODY_SCAN',
  'OPEN_DASHBOARD',
  'OPEN_AI',
  'CREATE_TODO',
  'CONTACT_USER',
  'LOG_WORKOUT',
  'LOG_EXERCISE',
  'LOG_DIARY',
  'LOG_FOOD',
  'SCAN_GYM_EQUIPMENT',
  'GET_EQUIPMENT_GUIDE',
  'GET_MACHINE_EXERCISE',
  'ADD_EXERCISE_TO_WORKOUT',
  'GET_NEXT_EXERCISE',
];

const WRITE_INTENTS = new Set([
  'CREATE_EXPENSE',
  'UPDATE_EXPENSE',
  'DELETE_EXPENSE',
  'CREATE_GROUP',
  'ADD_GROUP_MEMBER',
  'CREATE_GROUP_EXPENSE',
  'CREATE_SETTLEMENT',
  'CREATE_TODO',
  'CONTACT_USER',
  'LOG_WORKOUT',
  'LOG_EXERCISE',
  'LOG_DIARY',
  'LOG_FOOD',
  'ADD_EXERCISE_TO_WORKOUT',
]);

const NAV_INTENTS = new Set([
  'OPEN_GROUP', 'OPEN_GROUPS', 'OPEN_EXPENSES', 'OPEN_REPORTS', 'OPEN_SETTINGS',
  'OPEN_DIARY', 'OPEN_FITNESS', 'OPEN_WORKOUT_PLANNER', 'OPEN_TODOS', 'OPEN_BODY_SCAN', 'OPEN_DASHBOARD', 'OPEN_AI',
  'SCAN_GYM_EQUIPMENT',
]);

function normaliseIntent(raw) {
  const upper = String(raw || '').toUpperCase();
  return VOICE_INTENTS.includes(upper) ? upper : null;
}

/**
 * Validate + sanitise a provider parse result. Throws if it cannot be used.
 */
function sanitiseParseResult(parsed) {
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('AI returned no parse result');
  }
  const intent = normaliseIntent(parsed.intent);
  if (!intent) throw new Error(`AI returned unknown intent: ${parsed.intent}`);

  const entities = {};
  if (parsed.entities && typeof parsed.entities === 'object') {
    for (const [key, value] of Object.entries(parsed.entities)) {
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || Array.isArray(value)) {
        entities[key] = value;
      }
    }
  }

  const confidence = Number(parsed.confidence);
  const safeConfidence = Number.isFinite(confidence) ? Math.min(1, Math.max(0, confidence)) : 0;

  const clarification =
    parsed.clarification && typeof parsed.clarification === 'object'
      ? {
          question: String(parsed.clarification.question || ''),
          field: String(parsed.clarification.field || ''),
          options: Array.isArray(parsed.clarification.options)
            ? parsed.clarification.options.map((o) => String(o)).slice(0, 8)
            : [],
        }
      : null;

  return { intent, confidence: safeConfidence, entities, clarification };
}

module.exports = {
  VOICE_INTENTS,
  WRITE_INTENTS,
  NAV_INTENTS,
  normaliseIntent,
  sanitiseParseResult,
};