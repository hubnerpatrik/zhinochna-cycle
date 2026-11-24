import { getLocale } from './i18n.js';

// How each day is entered on the reference observation card, following its filled-in sample:
// crosses for present observations, the legend's letters for coded ones and +/- where the form asks for it.
// Rows: [label, baseline in the 714 × 1011 page space, value(entry, { codes, usualTime })].

const OTHER_TIME_TOLERANCE_MINUTES = 30;
const bool = value => value == null ? '' : value ? '+' : '-';
const cross = present => present ? 'X' : '';
const minutes = time => {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(time ?? ''));
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
};

/** The form's "other measurement time": more than ±30 minutes from the map's usual time. */
export function isOtherMeasurementTime(time, usualTime) {
  const actual = minutes(time), usual = minutes(usualTime);
  return actual != null && usual != null && Math.abs(actual - usual) > OTHER_TIME_TOLERANCE_MINUTES;
}

function colorCode(entry, codes) {
  if (entry.color === 'whiteTranslucent') return codes.color.white + codes.color.translucent;
  return codes.color[entry.color] ?? '';
}

export const FORM_ROWS = [
  ['Other measurement time', 429, (e, c) => isOtherMeasurementTime(e.measurementTime, c.usualTime) ? 'V' : ''],
  ['Factors affecting BBT', 440, (e, c) => e.tempFactors ? c.codes.factors[e.tempFactors] ?? '' : ''],
  ['Menstruation', 487, e => cross(e.bleeding === 'menstruation')],
  ['Spotting', 498, e => cross(e.bleeding === 'spotting')],
  ['Clots', 509, e => cross(e.sediment)],
  ['Sensation during the day:', 531, (e, c) => c.codes.sensation[e.sensation] ?? ''],
  ['Slippery when wiping', 560, e => bool(e.stretch)],
  ['Visible discharge', 587, e => bool(e.visible)],
  ['like cream', 611, e => cross(e.consistency === 'creamy')],
  ['slightly stretchy', 634, e => cross(e.consistency === 'slightlyStretchy')],
  ['stretchy', 657, e => cross(e.consistency === 'stretchy')],
  ['Color', 681, (e, c) => colorCode(e, c.codes)],
  ['Other (Gy, Gn, Y)', 700, e => e.color === 'other' ? (String(e.colorOther ?? '').trim().slice(0, 1).toLocaleUpperCase(getLocale()) || 'X') : ''],
  ['Mucus peak day', 724, e => e.markers?.mucus?.value || cross(e.isPeak)],
  ['F-firm / S-soft', 748, (e, c) => c.codes.firmness[e.cervixFirmness] ?? ''],
  ['Low / high', 766, (e, c) => c.codes.height[e.cervixHeight] ?? ''],
  ['Closed / open', 777, (e, c) => c.codes.openness[e.cervixOpenness] ?? ''],
  ['Intercourse', 847, e => cross(e.sex)],
];

/** Day and month as written on the card, e.g. "03.11". */
export const formDate = date => `${date.slice(8, 10)}.${date.slice(5, 7)}`;

const monthName = date => new Intl.DateTimeFormat(getLocale(), { month: 'long', timeZone: 'UTC' })
  .format(new Date(`${date.slice(0, 7)}-01T00:00:00Z`));

/** The month in words; a sheet that crosses months names both. */
export function formMonth(dates) {
  if (!dates.length) return '';
  const first = monthName(dates[0]), last = monthName(dates.at(-1));
  return first === last ? first : `${first} – ${last}`;
}

export function formYear(dates) {
  if (!dates.length) return '';
  const first = dates[0].slice(0, 4), last = dates.at(-1).slice(0, 4);
  return first === last ? first : `${first}/${last.slice(2)}`;
}
