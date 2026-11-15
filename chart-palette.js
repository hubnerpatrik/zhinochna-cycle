// Colours the temperature chart draws with. Canvas cannot read CSS variables cheaply on every frame,
// so the values mirror styles/tokens.css; test/chart-palette.test.js keeps the two in sync.
export const CHART_COLORS = Object.freeze({
  // Interface (from --ink, --ink-muted, --surface, --action).
  ink: '#162029',
  inkMuted: '#5f666d',
  paper: '#fffaf6',
  gridMajor: 'rgba(22,32,41,0.28)',
  gridMinor: 'rgba(22,32,41,0.10)',
  selection: 'rgba(194,73,46,0.08)',
  hover: 'rgba(194,73,46,0.45)',

  // Observations (from the --data-* tokens).
  adjusted: '#2563eb',
  fertile: '#16a34a',
  fertileFill: 'rgba(207,231,180,0.28)',
  fertileLine: 'rgba(22,163,74,0.78)',
  peakRing: 'rgba(22,163,74,0.75)',
  coverline: '#b41414',
  coverlineMuted: 'rgba(180,20,20,0.8)',
  coverlineGlow: 'rgba(180,20,20,0.35)',
  overflow: '#b43c45',
  influence: '#ff0000',
});
