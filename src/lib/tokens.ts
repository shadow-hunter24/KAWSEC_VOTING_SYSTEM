/** Shared design tokens for KAWSEC Voting System.
 *  Import `C` in every feature component instead of redeclaring it locally.
 *  All inline style objects use these values.
 */
export const C = {
  // ── Brand colours ──────────────────────────────────────────
  greenPrimary: '#1a4d2e',
  greenMid:     '#2d7a4f',
  greenDark:    '#0f2d1a',
  greenLight:   '#e8f5ee',
  creamBg:      '#fffdf7',
  creamCard:    '#f5f0e8',
  creamBorder:  '#e8e0cc',
  white:        '#ffffff',
  textPrimary:  '#1a1a1a',
  textMuted:    '#5a5a4a',

  // ── Error colours (T-1) ────────────────────────────────────
  errorRed:    '#dc2626',
  errorBg:     '#fef2f2',
  errorBorder: '#fecaca',

  // ── Warning colours (T-2) ──────────────────────────────────
  warnYellow:  '#b45309',
  warnBg:      '#fef3c7',
  warnBorder:  '#fcd34d',

  // ── Typography (T-3) ───────────────────────────────────────
  fontPrimary: "'Inter', ui-sans-serif, sans-serif",

  // ── Focus ring — box-shadow value (T-4) ────────────────────
  focusRing: '0 0 0 3px rgba(26,77,46,0.25)',

  // ── Shadows ────────────────────────────────────────────────
  shadowSm: '0 1px 4px rgba(0,0,0,0.06)',
  shadowMd: '0 4px 12px rgba(0,0,0,0.10)',
  shadowLg: '0 20px 60px rgba(15,45,26,0.4)',

  // ── Border-radius scale ────────────────────────────────────
  radiusSm: '6px',
  radiusMd: '10px',
  radiusLg: '16px',

  // ── Transitions ────────────────────────────────────────────
  transitionFast: '150ms ease',
  transitionBase: '200ms ease',
  transitionSlow: '300ms ease',
} as const;
