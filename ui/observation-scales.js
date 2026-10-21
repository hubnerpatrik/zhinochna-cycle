import { setText } from '../i18n.js';
import { duotoneArtwork } from './duotone-artwork.js';

export const OBSERVATION_LABELS = {
  sensation: { '': 'None', dry: 'Dry', moist: 'Moist', wet: 'Wet' },
  consistency: { '': 'None', creamy: 'Creamy', slightlyStretchy: 'Slightly stretchy', stretchy: 'Stretchy' },
  color: { '': 'No color', white: 'White', whiteTranslucent: 'White-translucent', translucent: 'Translucent', other: 'Other' },
  cervixFirmness: { hard: 'Hard', soft: 'Soft' },
  cervixHeight: { low: 'Low', medium: 'Middle', high: 'High' },
  cervixOpenness: { closed: 'Closed', medium: 'Medium', open: 'Open' },
};
export function observationScaleIcon(group, value) {
  if (!Object.hasOwn(OBSERVATION_LABELS, group) || !Object.hasOwn(OBSERVATION_LABELS[group], value)) return '';
  return `<svg class="observation-duotone" viewBox="0 0 48 40" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${duotoneArtwork(group, value)}</svg>`;
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
