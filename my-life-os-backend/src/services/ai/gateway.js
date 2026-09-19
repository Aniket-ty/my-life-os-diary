// AI gateway: prefers the dedicated Python service, falls back to the Node
// Groq provider, and finally to the deterministic heuristic parser. Returns
// a uniform contract either way.

const python = require('./pythonClient');
const groqProvider = require('./providers');
const { parseCommandHeuristic } = require('./heuristicParser');
const { sanitiseParseResult } = require('./contracts');

let pythonHealthyCache = null;
let pythonHealthTimer = null;

/** Health-check the Python service (cached for 30s to avoid timeout spam). */
async function isPythonHealthy() {
  if (!python.isConfigured()) return false;
  if (pythonHealthyCache !== null) return pythonHealthyCache;
  try {
    const res = await python.request('/health', { timeoutMs: 4000 });
    pythonHealthyCache = res && res.status === 'ok';
  } catch {
    pythonHealthyCache = false;
  }
  if (pythonHealthTimer) clearTimeout(pythonHealthTimer);
  pythonHealthTimer = setTimeout(() => { pythonHealthyCache = null; }, 30000);
  return pythonHealthyCache;
}

async function forcePythonHealthRefresh() {
  pythonHealthyCache = null;
  return isPythonHealthy();
}

/** How the AI will answer a voice/text command. */
async function parseCommand(text, context = {}) {
  if (await isPythonHealthy()) {
    try {
      const parsed = await python.postJson('/voice/command', { text, context: sanitiseContext(context) });
      if (parsed && parsed.intent) return parsed;
    } catch {
      // fall through to Node provider
    }
  }
  if (process.env.OPENAI_API_KEY || process.env.GROQ_API_KEY) {
    try {
      const parsed = await groqProvider.parseCommand(text, context);
      const cleaned = sanitiseParseResult(parsed);
      const provider = process.env.OPENAI_API_KEY ? 'openai' : 'groq';
      if (cleaned.intent) return { ...cleaned, provider };
    } catch {
      // fall through to heuristic
    }
  }
  const heuristic = parseCommandHeuristic(text, context);
  const cleaned = sanitiseParseResult(heuristic);
  return { ...cleaned, provider: 'heuristic' };
}

/** OCR a receipt image (base64 without data-uri prefix). */
async function extractReceipt(imageBase64, mimeType = 'image/jpeg') {
  const dataUriProvided = /^data:/.test(imageBase64);
  let base64 = imageBase64;
  if (dataUriProvided) {
    base64 = imageBase64.replace(/^data:[^;]+;base64,/, '');
  }
  if (await isPythonHealthy()) {
    try {
      const res = await python.postJson('/ocr/receipt', { image: base64, mimeType });
      if (res && res.total != null) return res;
    } catch {
      // fall through
    }
  }
  return groqProvider.extractReceipt(base64, mimeType);
}

/** Transcribe an audio buffer to text. */
async function transcribeAudio(buffer, mimeType = 'audio/webm') {
  if (await isPythonHealthy()) {
    try {
      const form = new FormData();
      const ext = (mimeType || 'audio/webm').split('/')[1] || 'webm';
      form.append('file', new Blob([buffer], { type: mimeType }), `audio.${ext}`);
      const res = await python.postMultipart('/voice/transcribe', form);
      if (res && res.text) return res.text;
    } catch {
      // fall through
    }
  }
  return groqProvider.transcribeAudio(buffer, mimeType);
}

function sanitiseContext(context) {
  const ctx = context || {};
  return {
    groups: Array.isArray(ctx.groups) ? ctx.groups.map((g) => ({ id: g.id, name: g.name, defaultCurrency: g.defaultCurrency })) : [],
    members: Array.isArray(ctx.members) ? ctx.members : [],
    now: new Date().toISOString(),
  };
}

module.exports = { parseCommand, extractReceipt, transcribeAudio, isPythonHealthy, forcePythonHealthRefresh };