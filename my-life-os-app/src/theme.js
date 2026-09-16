// Shared design tokens — mirrors my-life-os-web/src/index.css (@theme).
// Keep this in sync with the web app so mobile and web feel identical.

export const colors = {
  // Surfaces
  void: '#07070d',
  abyss: '#0b0b14',
  surface: '#111122',
  card: '#151529',
  cardHover: '#1a1a33',
  edge: '#26264a',

  // Brand accents
  gold: '#f5a623',
  gold400: '#f7b14b',
  gold300: '#f9c477',
  mint: '#7ee8c3',
  mint300: '#9fe1cb',
  violet: '#9b59b6',
  indigo: '#6366f1',

  // Module accents (match web Dashboard gradients)
  emerald: '#34d399',
  teal: '#2dd4bf',
  amber: '#f59e0b',
  orange: '#fb923c',
  rose: '#f43f5e',
  red: '#ef4444',
  sky: '#38bdf8',
  blue: '#3b82f6',
  purple: '#a855f7',

  // Text
  text: '#e8e8f0',
  textSoft: '#cbd5e1', // slate-300
  textMuted: '#94a3b8', // slate-400
  textFaint: '#64748b', // slate-500
  white: '#ffffff',
};

// Translucent overlays (web uses white/[0.04], white/10, etc.)
export const overlays = {
  faint: 'rgba(255,255,255,0.04)',
  soft: 'rgba(255,255,255,0.06)',
  mid: 'rgba(255,255,255,0.08)',
  strong: 'rgba(255,255,255,0.10)',
  border: 'rgba(255,255,255,0.10)',
  borderSoft: 'rgba(255,255,255,0.08)',
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
  h2: { fontSize: 18, fontWeight: '700', color: colors.white },
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

// Glassmorphism backgrounds (no blur on native; tuned to read the same)
export const glass = {
  backgroundColor: 'rgba(255,255,255,0.045)',
  borderWidth: 1,
  borderColor: overlays.borderSoft,
  borderRadius: radii.xl,
};

export const glassStrong = {
  backgroundColor: 'rgba(21,21,41,0.92)',
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.09)',
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
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  glow: (hex) => ({
    shadowColor: hex,
    shadowOpacity: 0.45,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  }),
};

export default { colors, overlays, spacing, radii, type, glass, glassStrong, tint, shadow };
