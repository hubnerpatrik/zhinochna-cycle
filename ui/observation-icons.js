// Shared 24-unit drawing grid. Labels stay separate for translation and readers.
const peak = '<path d="M8 20V4h5a5 5 0 0 1 0 10H8"/>';
const icons = {
  cycleDayRow: '<rect x="4" y="5" width="16" height="16" rx="3"/><path d="M8 3v4m8-4v4M4 11h16m-9 4h2v3"/>',
  bleedingRow: '<path d="M12 3s-7 8-7 12a7 7 0 0 0 14 0c0-4-7-12-7-12Z"/>',
  spottingRow: '<path d="M9 3s-5 6-5 9a5 5 0 0 0 10 0c0-3-5-9-5-9Z"/><circle cx="18" cy="18" r="2"/>',
  sedimentRow: '<circle cx="8" cy="8" r="4"/><circle cx="17" cy="10" r="3"/><circle cx="12" cy="18" r="3"/>',
  sensationRow: '<path d="M9 12V5a2 2 0 0 1 4 0v6l4 1a3 3 0 0 1 2 3l-1 6H9l-5-7a2 2 0 0 1 3-2l2 2"/>',
  stretchRow: '<path d="M3 8c3-5 6 5 9 0s6 5 9 0M3 16c3-5 6 5 9 0s6 5 9 0"/>',
  visibleRow: '<path d="M12 3s-4 5-4 8a4 4 0 0 0 8 0c0-3-4-8-4-8ZM4 18c4 4 12 4 16 0"/>',
  consistencyRow: '<path d="m6 4-3 3 3 3m-3-3h18m-3-3 3 3-3 3M6 18c3-8 9 8 12 0"/>',
  colorRow: '<path d="M12 3a9 9 0 1 0 0 18h1a2 2 0 0 0 1-4 2 2 0 0 1 1-4h3a3 3 0 0 0 3-3c0-4-4-7-9-7Z"/><circle cx="7.5" cy="10" r=".8"/><circle cx="11" cy="6.5" r=".8"/><circle cx="16" cy="7.5" r=".8"/>',
  blueMarkerRow: peak,
  cervixFirmnessRow: '<circle cx="12" cy="12" r="6"/><path d="M3 4v16m18-16v16M3 12h3m12 0h3"/>',
  cervixHeightRow: '<path d="M12 3v18m-4-4 4 4 4-4M8 7l4-4 4 4M4 12h3m10 0h3"/>',
  cervixOpennessRow: '<circle cx="12" cy="12" r="8"/>',
  orangeMarkerRow: peak,
  otherRow: '<path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6Z"/>',
  sexRow: '<circle cx="8" cy="12" r="4"/><circle cx="14" cy="9" r="4"/><path d="M8 16v6m-3-3h6m6-13 4-4m-4 0h4v4"/>',
};

export function observationIcon(rowId) {
  return `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${icons[rowId]}</svg>`;
}
