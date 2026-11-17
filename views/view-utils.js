export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

// Small garden accents shared by the app screens. Decorative only: hidden from assistive technology,
// coloured from the --meadow-* tokens in styles/garden.css, never used inside the active map.
export function gardenSprig() {
  return '<svg class="garden-sprig" viewBox="0 0 64 28" aria-hidden="true" focusable="false">'
    + '<path class="garden-stem" d="M2 26C14 24 26 18 36 10C42 5 50 3 58 4"/>'
    + '<path class="garden-leaf" d="M18 22C14 14 18 9 24 8C25 15 22 19 18 22Z"/>'
    + '<path class="garden-leaf" d="M30 15C34 8 40 7 45 9C41 14 36 16 30 15Z"/>'
    + '<g class="garden-petals" transform="translate(58 6)">'
    + [0, 72, 144, 216, 288].map(angle => `<ellipse cx="0" cy="-3.6" rx="2.4" ry="3.4" transform="rotate(${angle})"/>`).join('')
    + '</g><circle class="garden-heart" cx="58" cy="6" r="1.8"/></svg>';
}

export function gardenBloom() {
  const petals = Array.from({ length: 18 }, (_, i) => `<ellipse cx="0" cy="-15" rx="3.1" ry="11" transform="rotate(${i * 20})"/>`).join('');
  return '<svg class="garden-bloom" viewBox="-36 -36 72 112" aria-hidden="true" focusable="false">'
    + '<path class="garden-stem" d="M0 76C-2 50 3 30 0 8"/><path class="garden-leaf" d="M0 52C-14 48 -22 38 -22 30C-10 32 -2 42 0 52Z"/>'
    + `<g class="garden-bloom-petals">${petals}</g><circle class="garden-disc" r="6.5"/><circle class="garden-heart" r="3.4"/></svg>`;
}
