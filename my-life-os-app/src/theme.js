// Shared design tokens — mirrors my-life-os-web/src/index.css (@theme).
// Keep this in sync with the web app so mobile and web feel identical.

export const colors = {
  // Minimal neutral surfaces
  void: '#090b0d',
  abyss: '#0d1013',
  surface: '#12161a',
  card: '#171c21',
  cardHover: '#1d242c',
  edge: '#232b33',
  edgeStrong: '#2e3842',

  // Volt accent — single energetic green used across the OS
  volt: '#cdf654',
  volt300: '#e9ffab',
  volt400: '#d6f977',
  volt500: '#c1eb5c',

  // Legacy accent aliases (kept so screens stay functional)
  gold: '#c1eb5c',
  gold400: '#d6f977',
  gold300: '#e9ffab',
  mint: '#8fdfc0',
  mint300: '#bff1d8',
  violet: '#cdf654',
  indigo: '#8a7bd8',

  // Muted status palette (match web @theme)
  emerald: '#4db18b',
  teal: '#31bfae',
  amber: '#e8b45b',
  orange: '#e89358',
  rose: '#ea7d8e',
  red: '#cf4d56',
  sky: '#4da7e8',
  blue: '#5b8fe8',
  purple: '#ab7fe6',

  // Text
  text: '#e7eaf0',
  textSoft: '#c5cbd4',
  textMuted: '#8f99a3',
  textFaint: '#5f6a74',
  white: '#ffffff',
};

// Translucent overlays (web uses surface/card tonal equivalents)
export const overlays = {
  faint: 'rgba(255,255,255,0.04)',
  soft: 'rgba(255,255,255,0.06)',
  mid: 'rgba(255,255,255,0.08)',
  strong: 'rgba(255,255,255,0.10)',
  border: '#232b33',
  borderSoft: '#1e252c',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  pill: 999,
};

// Typography scale (system fonts; web uses Inter / Space Grotesk)
export const type = {
  display: { fontSize: 26, fontWeight: '800', color: colors.white, letterSpacing: -0.4 },
  h1: { fontSize: 22, fontWeight: '800', color: colors.white, letterSpacing: -0.3 },
  h2: { fontSize: 18, fontWeight: '700', color: colors.white, letterSpacing: -0.2 },
  h3: { fontSize: 16, fontWeight: '600', color: colors.white },
  body: { fontSize: 14, color: colors.text },
  bodyMuted: { fontSize: 13, color: colors.textMuted },
  small: { fontSize: 12, color: colors.textMuted },
  tiny: { fontSize: 11, color: colors.textFaint },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.textFaint,
  },
};

// Clean hairline card surfaces (no glass blur on native; matches web)
export const glass = {
  backgroundColor: colors.card,
  borderWidth: 1,
  borderColor: colors.edge,
  borderRadius: radii.xl,
};

export const glassStrong = {
  backgroundColor: colors.surface,
  borderWidth: 1,
  borderColor: colors.edge,
  borderRadius: radii.xxl,
};

// Gradient stand-ins: web uses from-*/to-* gradients. On native we approximate
// with tinted translucent surfaces + colored borders.
export const tint = (hex, alpha = 0.15) => {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
};

export const shadow = {
  card: {
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  glow: (hex) => ({
    shadowColor: hex,
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  }),
};

export default { colors, overlays, spacing, radii, type, glass, glassStrong, tint, shadow };