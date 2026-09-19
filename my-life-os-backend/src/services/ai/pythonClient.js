// HTTP client for the dedicated Python AI service (FastAPI).
// The service authenticates with a shared internal API key and must never be
// exposed directly to web/mobile clients — all requests go through Node.

const PYTHON_BASE = (process.env.AI_SERVICE_URL || '').replace(/\/+$/, '');
const AI_SERVICE_API_KEY = process.env.AI_SERVICE_API_KEY || '';

function isConfigured() {
  return Boolean(PYTHON_BASE);
}

async function request(path, { method = 'GET', body, headers = {}, timeoutMs = 30000 } = {}) {
  if (!PYTHON_BASE) throw new Error('AI service not configured');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${PYTHON_BASE}${path}`, {
      method,
      headers: {
        'X-AI-Service-Key': AI_SERVICE_API_KEY,
        ...headers,
      },
      body,
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`AI service error ${res.status}: ${text.slice(0, 200)}`);
    }
    return res.json();
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

/** POST JSON to the Python service. */
function postJson(path, payload) {
  return request(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

/** POST multipart file(s) to the Python service. */
function postMultipart(path, form) {
  return request(path, { method: 'POST', body: form });
}

module.exports = { isConfigured, request, postJson, postMultipart, baseUrl: PYTHON_BASE };