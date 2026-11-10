import { setText } from '../i18n.js';
import { duotoneArtwork } from './duotone-artwork.js';

import { OBSERVATION_LABELS } from './observation-labels.js';
export { OBSERVATION_LABELS } from './observation-labels.js';

function scaleSvg(artwork) {
  return `<svg class="observation-duotone" viewBox="0 0 48 40" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${artwork}</svg>`;
}

export function observationScaleIcon(group, value) {
  if (!Object.hasOwn(OBSERVATION_LABELS, group) || !Object.hasOwn(OBSERVATION_LABELS[group], value)) return '';
  const artwork = duotoneArtwork(group, value);
  return artwork ? scaleSvg(artwork) : '';
}

const CERVIX_HEIGHT_Y = { low: 31, medium: 20, high: 9 };

export function cervixPositionIcon(height, openness) {
  if (!openness) return observationScaleIcon('cervixHeight', height);
  if (!height) return observationScaleIcon('cervixOpenness', openness);
  const y = CERVIX_HEIGHT_Y[height];
  return scaleSvg(`
    <path d="M10 9v22M6 9h8M6 20h8M6 31h8" opacity=".4"/>
    <path d="M10 ${y}h9"/>
    <g transform="translate(15 ${y - 11}) scale(.55)">${duotoneArtwork('cervixOpenness', openness)}</g>
  `);
}

export function enhanceObservationScales(root = document) {
  root.querySelectorAll('.segmented button').forEach(button => {
    const { group, value } = button.dataset;
    const svg = observationScaleIcon(group, value);
    if (!svg) return;
    button.removeAttribute('data-i18n');
    button.parentElement.classList.add('observation-scale');
    const icon = document.createElement('span');
    icon.className = 'observation-scale-icon'; icon.innerHTML = svg;
    const label = document.createElement('span');
    setText(label, OBSERVATION_LABELS[group][value]);
    button.replaceChildren(icon, label);
  });
}
