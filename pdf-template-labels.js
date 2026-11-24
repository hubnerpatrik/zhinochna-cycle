import { getLanguage, getLocale, t } from './i18n.js';
import { MEASUREMENT_METHODS } from './profile-options.js';

// The reference observation card (assets/observation-template.png) is Ukrainian. For other languages its
// printed labels are replaced in place: only the text is whited out, so every line of the form stays, and
// each label keeps the reference's position, weight and size. Coordinates are in the 714 × 1011 page space.

export const FACTOR_LEGEND = 'Alcohol (A), travel (T), stress (S), medication (M), illness (I), restless sleep (R), new thermometer (N), physical activity (P), other';
export const SENSATION_LEGEND = 'D-dry / M-moist / W-wet';
export const COLOR_LEGEND = 'W-white, T-translucent';
export const FIRMNESS_LEGEND = 'F-firm / S-soft';
export const HEIGHT_LEGEND = 'Low / high';
export const OPENNESS_LEGEND = 'Closed / open';

const FACTOR_KEYS = ['alcohol', 'travel', 'stress', 'medication', 'illness', 'restlessSleep', 'newThermometer', 'physicalActivity'];
const MIDDLE = '–';
const FONT = 'Arial, sans-serif';
const INK = '#111';
const CAP = 0.72; // cap height of Arial as a share of the font size

const upper = value => value.toLocaleUpperCase(getLocale());
const codesBefore = (legend, separator) => t(legend).split(separator).map(part => part.trim().split('-')[0].trim());
const initials = legend => t(legend).split('/').map(part => upper(part.trim().slice(0, 1)));
const keyed = (keys, values) => Object.fromEntries(keys.map((key, index) => [key, values[index] || '']));

/** Letters written into the day cells, read from the translated legends so cells and legend always agree. */
export function formCodes() {
  const factorCodes = [...t(FACTOR_LEGEND).matchAll(/\(([^)]+)\)/g)].map(match => match[1].trim());
  const factors = factorCodes.length === FACTOR_KEYS.length ? keyed(FACTOR_KEYS, factorCodes)
    : keyed(FACTOR_KEYS, FACTOR_KEYS.map(key => upper(key.slice(0, 1))));
  const [low, high] = initials(HEIGHT_LEGEND);
  const [closed, open] = initials(OPENNESS_LEGEND);
  return {
    factors: { ...factors, other: '*' },
    sensation: keyed(['dry', 'moist', 'wet'], codesBefore(SENSATION_LEGEND, '/')),
    color: keyed(['white', 'translucent'], codesBefore(COLOR_LEGEND, ',')),
    firmness: keyed(['hard', 'soft'], codesBefore(FIRMNESS_LEGEND, '/')),
    height: { low, medium: MIDDLE, high },
    openness: { closed, medium: MIDDLE, open },
  };
}

function setFont(ctx, size, bold) { ctx.font = `${bold ? 'bold ' : ''}${size}px ${FONT}`; }

/** Largest size not above `size` at which every line fits `width`. */
function fittedSize(ctx, lines, size, bold, width) {
  let current = size;
  for (; current > 4.5; current -= 0.25) {
    setFont(ctx, current, bold);
    if (lines.every(line => ctx.measureText(line).width <= width)) break;
  }
  return current;
}

function wrap(ctx, text, width) {
  const lines = []; let line = '';
  for (const word of text.split(' ')) {
    const next = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(next).width > width) { lines.push(line); line = word; } else line = next;
  }
  return [...lines, line];
}

function blank(ctx, [x, y, w, h]) { ctx.fillStyle = '#fff'; ctx.fillRect(x, y, w, h); }

function write(ctx, text, x, y, { size, bold = false, align = 'left', width }) {
  const fitted = fittedSize(ctx, [text], size, bold, width);
  setFont(ctx, fitted, bold);
  ctx.fillStyle = INK; ctx.textAlign = align;
  ctx.fillText(text, x, y);
  ctx.textAlign = 'left';
}

// A ruled cell: its text parts (each starting a new line, long ones wrapping) are centred vertically.
function cell(ctx, [x, top, width, bottom], parts, { size = 8.2, lh = size + 2.6, align = 'left', wrapLines = true, breakAfterComma = false } = {}) {
  blank(ctx, [x - 1.8, top + 0.8, width + 2.6, bottom - top - 1.6]);
  const lines = [];
  for (const [source, bold = false, raw = false] of parts) {
    const text = raw ? source : t(source);
    setFont(ctx, size, bold);
    const pieces = breakAfterComma ? text.split(/(?<=,) /) : [text];
    for (const piece of pieces) for (const line of wrapLines ? wrap(ctx, piece, width) : [piece]) lines.push([line, bold]);
  }
  // Shrink when wrapped lines no longer fit the cell's height or a single word is wider than the cell.
  let fontSize = size, lineHeight = lh;
  while (fontSize > 4.5 && ((lines.length - 1) * lineHeight + CAP * fontSize > bottom - top - 1.5
    || lines.some(([line, bold]) => { setFont(ctx, fontSize, bold); return ctx.measureText(line).width > width; }))) {
    fontSize -= 0.25; lineHeight = fontSize + 2.6;
  }
  const block = (lines.length - 1) * lineHeight + CAP * fontSize;
  const first = top + (bottom - top - block) / 2 + CAP * fontSize;
  lines.forEach(([line, bold], index) => {
    setFont(ctx, fontSize, bold); ctx.fillStyle = INK; ctx.textAlign = align;
    ctx.fillText(line, align === 'center' ? x + width / 2 : x, first + index * lineHeight);
  });
  ctx.textAlign = 'left';
}

function rotated(ctx, [x, top, width, bottom], source) {
  blank(ctx, [x, top + 0.8, width, bottom - top - 1.6]);
  const text = t(source);
  const size = fittedSize(ctx, [text], 8.3, true, bottom - top - 3);
  setFont(ctx, size, true);
  ctx.save();
  ctx.translate(x + width / 2 + CAP * size / 2, (top + bottom) / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = INK; ctx.textAlign = 'center';
  ctx.fillText(text, 0, 0);
  ctx.restore();
  ctx.textAlign = 'left';
}

// Left column: [top, bottom, parts, options]; text runs from x 27 to 126.
const COLUMN = [
  [64.3, 90.3, [['Date', true]], { align: 'center', size: 8 }],
  [90.3, 101.3, [['Cycle day', true]], { align: 'center', size: 8.6, wrapLines: false }],
  [422.8, 434.3, [['Other measurement time']], { size: 8.4, wrapLines: false }],
  [434.3, 445.3, [['Factors affecting BBT']], { size: 8.4, wrapLines: false }],
  [469.3, 480.3, [['Cycle day', true]], { align: 'center', size: 8.6, wrapLines: false }],
  [480.3, 491.8, [['Menstruation']], { wrapLines: false }],
  [491.8, 502.8, [['Spotting']], { wrapLines: false }],
  [502.8, 513.8, [['Clots']], { wrapLines: false }],
  [513.8, 546.8, [['Sensation during the day:', true], [SENSATION_LEGEND]], { lh: 11 }],
  [546.8, 572.8, [['Slippery when wiping', true], ['(+/-)', false, true]], { lh: 11.5 }],
  [572.8, 598.8, [['Visible discharge', true], ['(+/-)', false, true]], { lh: 11 }],
  [705.8, 727.8, [['Mucus peak day', true]], { align: 'center', size: 8.5 }],
  [740.8, 754.3, [[FIRMNESS_LEGEND]], { size: 7.6, wrapLines: false }],
  [754.3, 782.3, [[HEIGHT_LEGEND], [OPENNESS_LEGEND]], { size: 7.3, lh: 10, wrapLines: false }],
  [795.3, 806.8, [['Mood changes (+/-)']], { size: 7.4, wrapLines: false }],
  [806.8, 818.3, [['Ovulation pain']], { size: 7.4, wrapLines: false }],
  [818.3, 828.8, [['Breast tenderness']], { size: 7.4, wrapLines: false }],
  [828.8, 839.8, [['Fertile days', true]], { align: 'center', size: 8.3, wrapLines: false }],
  [839.8, 850.8, [['Intercourse', true]], { align: 'center', size: 8.3, wrapLines: false }],
];

// Mucus characteristics: sub-rows to the right of the two rotated group labels (x 50.6–128).
const MUCUS_ROWS = [
  [599, 622, [['like cream']]],
  [622, 645, [['slightly stretchy'], ['(< 2 cm)', false, true]]],
  [645, 668, [['stretchy'], ['(> 2 cm)', false, true]]],
  [668, 693, [[COLOR_LEGEND]], { breakAfterComma: true }],
  [693, 706, [['Other (Gy, Gn, Y)']], { wrapLines: false, size: 8 }],
];

// Single labels: [source, x, baseline, size, bold, align, maxWidth, blank box].
const LABELS = [
  ['Chart No.', 27.5, 58.2, 9.2, true, 'left', 41, [27, 50.8, 40.5, 9.4]],
  ['Month:', 231, 58.2, 8.8, true, 'right', 70, [197, 50.8, 34.5, 9.4]],
  ['Year:', 398, 58.2, 8.8, true, 'right', 60, [377, 50.8, 17, 9.4]],
  ['Age:', 545, 58.2, 8.8, true, 'right', 60, [523, 50.8, 17, 9.4]],
  ['(full years)', 603, 58.2, 9.2, false, 'left', 88, [602.5, 50.8, 61, 9.4]],
  [FACTOR_LEGEND, 357.2, 453.2, 7.1, false, 'center', 660, [25.5, 446.4, 663, 9]],
  ['Cervical mucus table', 27, 466.2, 9.3, true, 'left', 400, [25.5, 457.6, 300, 10.8]],
  ['Cervix changes table', 27, 737.7, 9.2, true, 'left', 400, [25.5, 729.4, 300, 10.8]],
  ['Additional signs', 26.5, 792.3, 9.3, true, 'left', 400, [25.5, 783.8, 300, 10.8]],
  ['Chart No.', 27.5, 871.2, 9.2, true, 'left', 160, [27, 863.8, 40.5, 9.6]],
  ['High BBT phase in previous cycle (≥10 days)', 26, 884.6, 7.15, false, 'left', 180, [25.5, 878.8, 170, 10.4]],
  ['yes / no', 209.5, 887.6, 11.8, true, 'left', 46, [209, 878.6, 40, 10.2]],
  ['Goal in this cycle', 341.3, 871.2, 9.45, true, 'center', 136, [295.8, 863.8, 92, 9.6]],
  ['BBT measurement time', 479.5, 871.2, 9.3, true, 'center', 103, [429.5, 863.8, 103, 9.6]],
  ['(+/-30 min)', 490, 886.2, 9, false, 'left', 42, [489.5, 878.8, 37.5, 10]],
  ['BBT measurement method', 618, 871.2, 9.3, true, 'center', 138, [560.5, 863.8, 117, 9.6]],
  ...['Longest (LC) in the last 6-12 cycles', 'Shortest (SC) in the last 6-12 cycles', 'Last infertile day in the 1st phase (SC-21/20)', 'Cycle length']
    .map((source, row) => [source, 27, 913 + row * 13, 8.3, false, 'left', 216, [26.5, 906.4 + row * 13, 208, 9.2]]),
  ...['First mucus day', 'First high-quality mucus day', 'Number of high-quality mucus days', 'Mucus peak day']
    .map((source, row) => [source, 311.5, 913 + row * 13, 8.3, false, 'left', 140, [311, 906.4 + row * 13, 139, 9.2]]),
  ...['3rd day of BBT rise', 'Mucus peak +4', 'Cervix peak +4']
    .map((source, row) => [source, 523, 913 + row * 13, 8.3, false, 'left', 113, [522.5, 906.4 + row * 13, 100, 9.2]]),
  ['LP by BBT', 523, 952, 8.3, false, 'left', 49, [522.5, 945.4, 42, 9.2]],
  ['by CM', 637.5, 952, 8.3, false, 'right', 22, [615, 945.4, 23, 9.2]],
];

/** Repaints the reference's printed labels in the app language; the Ukrainian reference stays as printed. */
export function drawTemplateLabels(ctx, language = getLanguage()) {
  if (language === 'uk') return;
  for (const [top, bottom, parts, options] of COLUMN) cell(ctx, [27, top, 99, bottom], parts, options);
  for (const [top, bottom, parts, options] of MUCUS_ROWS) cell(ctx, [53, top, 74, bottom], parts, { align: 'center', lh: 10, ...options });
  rotated(ctx, [25.1, 599, 10.6, 706], 'Mucus characteristics');
  rotated(ctx, [37.9, 599, 11, 668], 'Consistency');
  rotated(ctx, [37.9, 668, 11, 706], 'Color');
  for (const [source, x, y, size, bold, align, width, box] of LABELS) {
    blank(ctx, box);
    write(ctx, t(source), x, y, { size, bold, align, width });
  }
}

const METHOD_ORDER = ['oral', 'rectal', 'vaginal'];

/**
 * Footer choices in every language: the goal options stay blank (the app keeps no goal), and the BBT method
 * options are printed with the map's own method emphasised in the entry colour.
 */
export function drawFormChoices(ctx, method, ink) {
  blank(ctx, [279, 878.8, 127.5, 10.5]);
  blank(ctx, [564.5, 878.8, 116.5, 10]);
  const labels = METHOD_ORDER.map((key, index) => {
    const text = t(MEASUREMENT_METHODS[key]);
    return [key, index ? text.toLocaleLowerCase(getLocale()) : text];
  });
  const separator = ' / ';
  const measure = size => labels.reduce((sum, [key, text], index) => {
    setFont(ctx, size, key === method);
    const width = ctx.measureText(text).width;
    setFont(ctx, size, false);
    return sum + width + (index ? ctx.measureText(separator).width : 0);
  }, 0);
  let size = 7.4;
  while (size > 4.5 && measure(size) > 138) size -= 0.25;
  let x = 622.5 - measure(size) / 2;
  labels.forEach(([key, text], index) => {
    if (index) { setFont(ctx, size, false); ctx.fillStyle = INK; ctx.fillText(separator, x, 885); x += ctx.measureText(separator).width; }
    const selected = key === method;
    setFont(ctx, size, selected); ctx.fillStyle = selected ? ink : INK;
    ctx.fillText(text, x, 885);
    x += ctx.measureText(text).width;
  });
}
