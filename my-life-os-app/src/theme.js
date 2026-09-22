// Shared design tokens — mirrors my-life-os-web/src/index.css (@theme).
// Keep this in sync with the web app so mobile and web feel identical.

export const colors = {
  // Minimal neutral surfaces — deep obsidian slate
  void: '#090a10',
  abyss: '#0e1017',
  surface: '#131722',
  card: '#181d2b',
  cardHover: '#202738',
  edge: '#262e42',
  edgeStrong: '#333d57',

  // Primary Accent — Electric Indigo / Royal Iris
  volt: '#6366f1',
  volt300: '#c7d2fe',
  volt400: '#818cf8',
  volt500: '#4f46e5',

  // Legacy accent aliases (harmonized with theme)
  gold: '#f59e0b',
  gold400: '#fbbf24',
  gold300: '#fde68a',
  mint: '#38bdf8',
  mint300: '#7dd3fc',
  violet: '#8b5cf6',
  indigo: '#6366f1',

  // Muted status palette (match web @theme)
  emerald: '#10b981',
  teal: '#14b8a6',
  amber: '#f59e0b',
  orange: '#f97316',
  rose: '#f43f5e',
  red: '#ef4444',
  sky: '#38bdf8',
  blue: '#3b82f6',
  purple: '#a855f7',

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
  border: '#262e42',
  borderSoft: '#202738',
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