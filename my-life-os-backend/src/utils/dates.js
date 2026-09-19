// Date helpers + natural-language date parsing used by the voice/AI layer.
// The AI returns structured dates; Node owns the actual parsing/validation.

const MS_DAY = 24 * 60 * 60 * 1000;

function toISODate(date) {
  const d = date instanceof Date ? date : new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseISODate(str) {
  if (typeof str !== 'string') return null;
  const m = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function addDays(date, days) {
  const d = new Date(date.getTime());
  d.setDate(d.getDate() + days);
  return d;
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function dayRange(date) {
  const start = startOfDay(date);
  return { start, end: new Date(start.getTime() + MS_DAY) };
}

function weekRange(date = new Date()) {
  const start = startOfDay(date);
  const day = (start.getDay() + 6) % 7; // Monday first
  const monday = addDays(start, -day);
  return { start: monday, end: addDays(monday, 7) };
}

function monthRange(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  return { start, end };
}

function yearRange(date = new Date()) {
  const start = new Date(date.getFullYear(), 0, 1);
  const end = new Date(date.getFullYear() + 1, 0, 1);
  return { start, end };
}

const MONTH_NAMES = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
];
const MONTH_ABBR = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const WEEKDAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const WEEKDAY_ABBR = ['sun', 'mon', 'tue', 'tues', 'wed', 'thu', 'thur', 'thurs', 'fri', 'sat'];

function findWeekday(str) {
  const lower = str.toLowerCase();
  const full = WEEKDAY_NAMES.findIndex((w) => w === lower);
  if (full >= 0) return full;
  return WEEKDAY_ABBR.findIndex((w) => w === lower);
}

function nextWeekday(weekday, after = new Date()) {
  const anchor = startOfDay(after);
  let diff = (weekday - anchor.getDay() + 7) % 7;
  if (diff === 0) diff = 7; // "Monday" means the next Monday, not today
  return addDays(anchor, diff);
}

function parseMonthIndex(str) {
  const lower = str.toLowerCase();
  const full = MONTH_NAMES.indexOf(lower);
  if (full >= 0) return full;
  return MONTH_ABBR.indexOf(lower);
}

const NUM_WORDS = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6,
  seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
  thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17,
  eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40,
  fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
};

function wordToNumber(str) {
  const lower = str.toLowerCase();
  if (/^\d+$/.test(lower)) return Number(lower);
  const parts = lower.split(/[\s-]+/);
  let total = 0;
  for (const p of parts) {
    if (p in NUM_WORDS) total += NUM_WORDS[p];
  }
  return parts.length && (parts.every((p) => p in NUM_WORDS)) ? total : null;
}

/**
 * Parse a natural language date expression into an ISO date string.
 * Relies on a reference "now" so today/yesterday/etc. are relative.
 */
function parseDateExpression(raw, now = new Date()) {
  if (!raw || typeof raw !== 'string') return null;
  const str = raw.toLowerCase().trim();

  // Absolute dates: ISO
  const iso = parseISODate(raw);
  if (iso) return toISODate(iso);

  // d/m/yyyy and d-m-yyyy
  let m = str.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (m) {
    const day = Number(m[1]);
    let month = Number(m[2]);
    let year = Number(m[3]);
    if (year < 100) year += 2000;
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  // 15 September / 15th Sept / Sept 15
  m = str.match(/(?:(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]+))|(?:([a-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?)/);
  if (m) {
    const monthIdx = parseMonthIndex(m[1] || m[3]);
    const day = Number(m[2] || m[4]);
    if (monthIdx >= 0 && day >= 1 && day <= 31) {
      const year = now.getFullYear();
      return `${year}-${String(monthIdx + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  // Weekday names
  const weekday = findWeekday(str.replace(/[^a-z\s-]/g, ''));
  const weekdayOnly = WEEKDAY_NAMES.includes(str) || WEEKDAY_ABBR.includes(str);
  if (weekday >= 0 && weekdayOnly) {
    return toISODate(nextWeekday(weekday, now));
  }

  // Relative expressions
  if (/\btoday\b|\btonight\b|\bnow\b/.test(str)) return toISODate(now);
  if (/\byesterday\b/.test(str)) return toISODate(addDays(now, -1));
  if (/\btomorrow\b/.test(str)) return toISODate(addDays(now, 1));

  m = str.match(/(\d+|[\w-]+)\s+days?\s+ago/);
  if (m) {
    const n = wordToNumber(m[1]);
    if (n != null) return toISODate(addDays(now, -n));
  }

  m = str.match(/in\s+(\d+|[\w-]+)\s+days?/);
  if (m) {
    const n = wordToNumber(m[1]);
    if (n != null) return toISODate(addDays(now, n));
  }

  return null;
}

function parseAmountExpression(text) {
  // Extract the first clearly-numeric amount from speech text.
  const cleaned = text.replace(/,/g, '');
  let m = cleaned.match(/(?:₹|rs\.?|inr|rupees?|rs)\s*(\d+(?:\.\d{1,2})?)/i);
  if (m) return m[1];
  m = cleaned.match(/\$(\d+(?:\.\d{1,2})?)/);
  if (m) return m[1];
  m = cleaned.match(/(\d+(?:\.\d{1,2})?)\s*(?:rupees?|bucks|dollars|euros|yen|pounds)/i);
  if (m) return m[1];
  m = cleaned.match(/(\d+(?:\.\d{1,2})?)/);
  if (m) return m[1];
  return null;
}

module.exports = {
  toISODate,
  parseISODate,
  addDays,
  startOfDay,
  dayRange,
  weekRange,
  monthRange,
  yearRange,
  parseDateExpression,
  parseAmountExpression,
};