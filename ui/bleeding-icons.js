export const BLEEDING_LABELS = { heavy: 'Heavy', medium: 'Moderate', light: 'Light', spotting: 'Spotting' };

// The same intensity symbols appear in the picker and saved map cells.
export function bleedingIcon(intensity) {
  const count = { heavy: 3, medium: 2 }[intensity] || 1;
  const drop = 'M6 1C4 4 1 7 1 10a5 5 0 0 0 10 0C11 7 8 4 6 1Z';
  const paths = Array.from({ length: count }, (_, index) => `<g transform="translate(${(3 - count) * 6 + index * 12} 1)"><path d="${drop}" fill="${intensity === 'spotting' || !intensity ? 'none' : 'currentColor'}" fill-opacity=".3"/>${intensity === 'spotting' ? '<path d="M1 10a5 5 0 0 0 10 0Z" fill="currentColor" fill-opacity=".3"/>' : ''}</g>`).join('');
  return `<svg viewBox="0 0 36 18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.3">${paths}</svg>`;
}
