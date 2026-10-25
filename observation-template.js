import { MILLISECONDS_PER_DAY } from './date-utils.js';
import { cycleStarts } from './cycle-summary.js';
import { t } from './i18n.js';
import { TEMP_FACTORS } from './core.js';

export const TEMPLATE_DAYS = 43;
export function templatePages(map) {
  const keys = Object.keys(map.entries || {}).sort();
  if (!keys.length) return [{ dates: [], start: null, offset: 0 }];
  const starts = cycleStarts(map.entries);
  const boundaries = [...new Set([keys[0], ...starts])].sort();
  const pages = [];
  boundaries.forEach((start, index) => {
    const first = Date.parse(start + 'T00:00:00Z');
    const end = index + 1 < boundaries.length ? Date.parse(boundaries[index + 1] + 'T00:00:00Z') - MILLISECONDS_PER_DAY : Date.parse(keys.at(-1) + 'T00:00:00Z');
    for (let time = first; time <= end; time += TEMPLATE_DAYS * MILLISECONDS_PER_DAY) {
      const dates = Array.from({ length: Math.min(TEMPLATE_DAYS, (end - time) / MILLISECONDS_PER_DAY + 1) }, (_, day) => new Date(time + day * MILLISECONDS_PER_DAY).toISOString().slice(0, 10));
      pages.push({ dates, start, offset: (time - first) / MILLISECONDS_PER_DAY });
      if (pages.length > 1000) throw new Error('Map is too long to export.');
    }
  });
  return pages;
}

const bool = value => value == null ? '' : value ? '+' : '-';
const initial = value => value ? t(value).slice(0, 1) : '';
export const TEMPLATE_ROWS = [
  ['Measurement time', 429, e => e.measurementTime || ''],
  ['Influence factors', 440, e => initial(TEMP_FACTORS[e.tempFactors])],
  ['Period', 487, e => e.bleeding === 'menstruation' ? 'X' : ''],
  ['Spotting', 498, e => e.bleeding === 'spotting' ? 'X' : ''],
  ['Clots', 509, e => bool(e.sediment)],
  ['Sensation', 531, e => initial({ dry: 'Dry', moist: 'Moist', wet: 'Wet' }[e.sensation])],
  ['Slippery', 560, e => bool(e.stretch)],
  ['Discharge', 587, e => bool(e.visible)],
  ['Creamy', 611, e => e.consistency === 'creamy' ? 'X' : ''],
  ['Slightly stretchy', 634, e => e.consistency === 'slightlyStretchy' ? 'X' : ''],
  ['Stretchy', 657, e => e.consistency === 'stretchy' ? 'X' : ''],
  ['Color', 681, e => e.color === 'whiteTranslucent' ? initial('White') + initial('Translucent') : initial({ white: 'White', translucent: 'Translucent', other: 'Other' }[e.color])],
  ['Other color', 700, e => e.colorOther ? '*' : ''],
  ['Mucus peak', 724, e => e.markers?.mucus?.value || (e.isPeak ? 'X' : '')],
  ['Firmness', 748, e => initial({ hard: 'Hard', soft: 'Soft' }[e.cervixFirmness])],
  ['Height / Openness', 770, e => [({ low: '↓', medium: '↔', high: '↑' }[e.cervixHeight] || ''), ({ closed: '−', medium: '○', open: '+' }[e.cervixOpenness] || '')].join('')],
  ['Fertile range', 835, e => e.isFertile ? '+' : ''],
  ['Sex', 847, e => bool(e.sex)],
];
