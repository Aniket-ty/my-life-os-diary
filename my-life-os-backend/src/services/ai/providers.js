// AI provider (OpenAI / Groq Node-side fallback).
// Supports OpenAI (default if OPENAI_API_KEY is present) and Groq.

let openai = null;
if (process.env.OPENAI_API_KEY) {
  try {
    const OpenAI = require('openai');
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  } catch {
    // ignore
  }
}

let groq = null;
if (process.env.GROQ_API_KEY) {
  try {
    const Groq = require('groq-sdk');
    groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  } catch {
    // ignore
  }
}

const { VOICE_INTENTS } = require('./contracts');

const INTENT_LIST = VOICE_INTENTS;

const PARSE_PROMPT = `You are the command interpreter inside a personal life OS application (expenses, fitness, diary, tasks).

Rules:
- Convert the user's natural-language request into ONE structured intent.
- Return ONLY valid JSON (no markdown, no commentary).
- Never invent amounts, dates or names the user did not say; if something is
  missing set it to null and set "clarification" with a short question.
- Dates must be YYYY-MM-DD. "yesterday"/"today"/"last month" -> the actual date or "period" entity.
- money is always the numeric value without currency symbols.
- Never generate code or SQL. The backend will perform the action.

Intents: ${INTENT_LIST.join(', ')}

Response shape:
{
  "intent": "CREATE_EXPENSE",
  "confidence": 0.0,
  "entities": { },
  "clarification": null
}

Entity reference:
- CREATE_EXPENSE: { amount, currency, category, description, date, period }
- UPDATE_EXPENSE / DELETE_EXPENSE: { expenseId?, amount?, category?, description?, date?, period? }
- GET_EXPENSES / GET_DAILY_TOTAL / GET_MONTHLY_TOTAL / GET_CATEGORY_TOTAL: { date, period, category }
- CREATE_GROUP: { groupName }
- ADD_GROUP_MEMBER: { memberName, groupName }
- CREATE_GROUP_EXPENSE: { groupName, amount, currency, description, date, paidBy, splitType, members[] }
- GET_GROUP_BALANCE / GET_USER_BALANCE: { groupName?, memberName? }
- CREATE_SETTLEMENT: { memberName, amount, currency, groupName? }
- OPEN_GROUP: { groupName }
- CONVERT_CURRENCY: { amount, from, to }
- SCAN_BILL: { }
- SCAN_GYM_EQUIPMENT: { } (Use when asking what machine/equipment something is, or asking to identify/scan gym equipment, e.g. "what machine is this?", "what is this machine?", "identify this equipment", "scan this machine")
- GET_EQUIPMENT_GUIDE: { equipmentName? } (Use ONLY when asking HOW to use or adjust a machine, e.g. "how do I use this machine?", "how to set up leg press", "how to adjust seat")
- GET_MACHINE_EXERCISE: { muscle?, equipmentName? } (e.g., "show me an exercise for chest using this machine", "exercise for back")
- ADD_EXERCISE_TO_WORKOUT: { exerciseName? } (e.g., "add this exercise to today's workout", "add bench press to my workout")
- GET_NEXT_EXERCISE: { } (e.g., "give me the next exercise", "what's the next exercise", "start this exercise")
- Navigation: OPEN_DIARY, OPEN_FITNESS, OPEN_WORKOUT_PLANNER, OPEN_TODOS, OPEN_BODY_SCAN, OPEN_DASHBOARD, OPEN_AI: { }
- CREATE_TODO: { title }
- CONTACT_USER: { query }
Use "CURRENT_USER" to mean the speaker. splitType is one of EQUAL/EXACT/PERCENTAGE/SHARES.`;

const parseJson = (text) => {
  const cleaned = String(text).trim().replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
};

async function parseCommand(text, context = {}) {
  const messages = [
    { role: 'system', content: `${PARSE_PROMPT}\n\nUseful context:\n${contextContext(context)}` },
    { role: 'user', content: text },
  ];

  if (openai) {
    try {
      const response = await openai.chat.completions.create({
        model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
        messages,
        temperature: 0,
        max_tokens: 500,
        response_format: { type: 'json_object' },
      });
      const parsed = parseJson(response.choices[0]?.message?.content || '');
      if (parsed) return parsed;
    } catch (err) {
      console.warn('OpenAI parseCommand failed, checking fallbacks:', err.message);
    }
  }

  if (groq) {
    const response = await groq.chat.completions.create({
      model: 'openai/gpt-oss-120b',
      messages,
      temperature: 0,
      max_tokens: 500,
    });
    const parsed = parseJson(response.choices[0]?.message?.content || '');
    if (parsed) return parsed;
  }

  throw new Error('AI returned an unparseable command');
}

function contextContext(context) {
  if (!context) return 'none';
  const parts = [];
  if (context.groups?.length) parts.push(`User's groups: ${context.groups.map((g) => g.name).join(', ')}`);
  if (context.members?.length) parts.push(`Known people: ${context.members.join(', ')}`);
  parts.push(`Today: ${new Date().toISOString().slice(0, 10)}`);
  return parts.join('\n') || 'none';
}

const RECEIPT_PROMPT = `You are a receipt parser. Extract purchase information from the receipt image.
Return ONLY valid JSON with this exact shape:
{
  "merchant": "string",
  "date": "YYYY-MM-DD or null",
  "currency": "INR/USD/EUR/etc or null",
  "subtotal": number,
  "tax": number,
  "tip": number,
  "total": number,
  "items": [ {"name": "string", "quantity": number, "unitPrice": number, "amount": number} ],
  "confidence": 0.0,
  "rawText": "optional short snippet"
}
If a field is not present use null. Numbers only (no currency symbols).`;

async function extractReceipt(imageBase64, mimeType = 'image/jpeg') {
  const dataUri = `data:${mimeType};base64,${imageBase64}`;
  const messages = [
    {
      role: 'user',
      content: [
        { type: 'text', text: RECEIPT_PROMPT },
        { type: 'image_url', image_url: { url: dataUri } },
      ],
    },
  ];

  if (openai) {
    try {
      const response = await openai.chat.completions.create({
        model: process.env.OPENAI_VISION_MODEL || 'gpt-4o-mini',
        messages,
        temperature: 0.1,
        max_tokens: 1024,
        response_format: { type: 'json_object' },
      });
      const parsed = parseJson(response.choices[0]?.message?.content || '');
      if (parsed) return parsed;
    } catch (err) {
      console.warn('OpenAI extractReceipt failed, trying Groq:', err.message);
    }
  }

  if (groq) {
    const response = await groq.chat.completions.create({
      model: 'qwen/qwen3.8-27b',
      messages,
      temperature: 0.1,
      max_tokens: 1024,
    });
    const parsed = parseJson(response.choices[0]?.message?.content || '');
    if (parsed) return parsed;
  }

  throw new Error('OCR returned an unparseable receipt');
}

/** Transcribe an audio buffer using OpenAI or Groq Whisper. */
async function transcribeAudio(buffer, mimeType = 'audio/webm') {
  const ext = (mimeType || 'audio/webm').split('/')[1] || 'webm';
  const blob = new Blob([buffer], { type: mimeType });
  const form = new FormData();
  form.append('file', blob, `audio.${ext}`);

  if (process.env.OPENAI_API_KEY) {
    form.append('model', 'whisper-1');
    const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: form,
    });
    if (res.ok) {
      const json = await res.json();
      return json.text || '';
    }
  }

  if (process.env.GROQ_API_KEY) {
    form.append('model', 'whisper-large-v3-turbo');
    const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
      body: form,
    });
    if (res.ok) {
      const json = await res.json();
      return json.text || '';
    }
  }

  throw new Error('Speech-to-text failed: neither OpenAI nor Groq API key configured');
}

module.exports = {
  parseCommand,
  extractReceipt,
  transcribeAudio,
  providerName: process.env.OPENAI_API_KEY ? 'openai' : 'groq',
};