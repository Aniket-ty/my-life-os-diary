/**
 * International Phone Number Utilities & Country Codes
 * Supports global E.164 normalization, multi-country dial codes, and cross-format search.
 */

const COUNTRY_CODES = [
  { code: '+91', country: 'IN', flag: '🇮🇳', name: 'India' },
  { code: '+1', country: 'US', flag: '🇺🇸', name: 'United States / Canada' },
  { code: '+44', country: 'GB', flag: '🇬🇧', name: 'United Kingdom' },
  { code: '+971', country: 'AE', flag: '🇦🇪', name: 'United Arab Emirates' },
  { code: '+65', country: 'SG', flag: '🇸🇬', name: 'Singapore' },
  { code: '+61', country: 'AU', flag: '🇦🇺', name: 'Australia' },
  { code: '+49', country: 'DE', flag: '🇩🇪', name: 'Germany' },
  { code: '+33', country: 'FR', flag: '🇫🇷', name: 'France' },
  { code: '+81', country: 'JP', flag: '🇯🇵', name: 'Japan' },
  { code: '+86', country: 'CN', flag: '🇨🇳', name: 'China' },
  { code: '+966', country: 'SA', flag: '🇸🇦', name: 'Saudi Arabia' },
  { code: '+974', country: 'QA', flag: '🇶🇦', name: 'Qatar' },
  { code: '+880', country: 'BD', flag: '🇧🇩', name: 'Bangladesh' },
  { code: '+977', country: 'NP', flag: '🇳🇵', name: 'Nepal' },
  { code: '+94', country: 'LK', flag: '🇱🇰', name: 'Sri Lanka' },
  { code: '+60', country: 'MY', flag: '🇲🇾', name: 'Malaysia' },
  { code: '+62', country: 'ID', flag: '🇮🇩', name: 'Indonesia' },
  { code: '+64', country: 'NZ', flag: '🇳🇿', name: 'New Zealand' },
  { code: '+34', country: 'ES', flag: '🇪🇸', name: 'Spain' },
  { code: '+39', country: 'IT', flag: '🇮🇹', name: 'Italy' },
  { code: '+31', country: 'NL', flag: '🇳🇱', name: 'Netherlands' },
  { code: '+41', country: 'CH', flag: '🇨🇭', name: 'Switzerland' },
  { code: '+46', country: 'SE', flag: '🇸🇪', name: 'Sweden' },
  { code: '+27', country: 'ZA', flag: '🇿🇦', name: 'South Africa' },
  { code: '+55', country: 'BR', flag: '🇧🇷', name: 'Brazil' },
  { code: '+52', country: 'MX', flag: '🇲🇽', name: 'Mexico' },
];

/**
 * Normalizes any international phone number string to E.164 format (+[countryCode][digits]).
 * Returns null if invalid or empty.
 */
function normalizePhoneNumber(raw, defaultDialCode = '+91') {
  if (!raw || typeof raw !== 'string') return null;
  let str = raw.trim();
  if (!str) return null;

  // Convert international 00 prefix to +
  if (str.startsWith('00')) {
    str = '+' + str.slice(2);
  }

  // Check if starts with +
  const hasPlus = str.startsWith('+');

  // Strip all non-digit characters
  const digits = str.replace(/\D/g, '');
  if (!digits || digits.length < 5 || digits.length > 15) return null;

  if (hasPlus) {
    return `+${digits}`;
  }

  // If no plus, but starts with a known country dial code without plus
  for (const c of COUNTRY_CODES) {
    const codeDigits = c.code.replace('+', '');
    if (digits.startsWith(codeDigits) && digits.length > codeDigits.length + 4) {
      return `+${digits}`;
    }
  }

  // Otherwise prepend default dial code
  const cleanDefault = defaultDialCode.replace('+', '');
  return `+${cleanDefault}${digits}`;
}

/**
 * Generates search patterns for phone number queries to match across
 * different formats (e.g. searching '9876543210' matches '+919876543210').
 */
function getPhoneSearchPatterns(rawQuery) {
  if (!rawQuery || typeof rawQuery !== 'string') return [];
  const digits = rawQuery.replace(/\D/g, '');
  if (!digits || digits.length < 3) return [];

  const patterns = new Set();
  patterns.add(digits);
  patterns.add(`+${digits}`);

  // If digits are long enough (>= 7), include the last 7 to 10 digits to match national number
  if (digits.length >= 7) {
    patterns.add(digits.slice(-7));
  }
  if (digits.length >= 10) {
    patterns.add(digits.slice(-10));
  }

  return Array.from(patterns);
}

module.exports = {
  COUNTRY_CODES,
  normalizePhoneNumber,
  getPhoneSearchPatterns,
};
