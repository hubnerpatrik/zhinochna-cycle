import test from 'node:test';
import assert from 'node:assert/strict';
import { setLanguage } from '../i18n.js';
import { drawTemplateLabels, formCodes } from '../pdf-template-labels.js';
import { FORM_ROWS, formDate, formMonth, isOtherMeasurementTime } from '../pdf-form-rows.js';
import { mapPdf } from '../map-export.js';

// A canvas stand-in that records what was drawn and with which font and colour.
function recordingContext() {
  const state = { font: '', fillStyle: '', strokeStyle: '' };
  const texts = [], arcs = [], fills = [];
  const context = {
    ...{ strokeRect() {}, drawImage() {}, scale() {}, rect() {}, clip() {}, beginPath() {}, stroke() {}, fill() {}, translate() {}, rotate() {}, setLineDash() {}, moveTo() {}, lineTo() {} },
    save() {}, restore() {},
    fillRect(x, y, w, h) { fills.push({ x, y, w, h, fillStyle: state.fillStyle }); },
    arc(x, y, r) { arcs.push({ x, y, r, strokeStyle: state.strokeStyle }); },
    fillText(text, x, y) { texts.push({ text: String(text), x, y, font: state.font, fillStyle: state.fillStyle }); },
    measureText(text) { return { width: String(text).length * 4 }; },
  };
  for (const key of Object.keys(state)) Object.defineProperty(context, key, { get: () => state[key], set: value => { state[key] = value; } });
  for (const key of ['textAlign', 'lineWidth', 'textBaseline']) context[key] = undefined;
  return { context, texts, arcs, fills };
}

const CYRILLIC = /[Ѐ-ӿ]/;

test('form codes come from the translated legends, so cells and legend always agree', () => {
  try {
    setLanguage('en');
    assert.deepEqual(formCodes().factors, { alcohol: 'A', travel: 'T', stress: 'S', medication: 'M', illness: 'I', restlessSleep: 'R', newThermometer: 'N', physicalActivity: 'P', other: '*' });
    assert.deepEqual(formCodes().sensation, { dry: 'D', moist: 'M', wet: 'W' });
    setLanguage('uk');
    // The reference chart's own letters: подорож (П), прийом ліків (Л), С-сухо, М-мокро, Т-тверда.
    assert.equal(formCodes().factors.travel, 'П');
    assert.equal(formCodes().factors.medication, 'Л');
    assert.deepEqual(formCodes().sensation, { dry: 'С', moist: 'В', wet: 'М' });
    assert.deepEqual(formCodes().color, { white: 'Б', translucent: 'П' });
    assert.equal(formCodes().firmness.hard, 'Т');
    for (const language of ['en', 'cs', 'sk', 'uk']) {
      setLanguage(language);
      const { factors, sensation, color, firmness } = formCodes();
      for (const codes of [factors, sensation, color, firmness]) {
        const values = Object.values(codes);
        assert.equal(new Set(values).size, values.length, `${language} codes are unique`);
        assert.ok(values.every(Boolean));
      }
    }
  } finally { setLanguage('en'); }
});

test('reference labels are repainted with the template layout in the app language', () => {
  try {
    for (const [language, title, chart] of [['en', 'Cervical mucus table', 'Chart No.'], ['cs', 'Tabulka stavu cervikálního hlenu', 'Karta č.'], ['sk', 'Tabuľka stavu cervikálneho hlienu', 'Karta č.']]) {
      setLanguage(language);
      const { context, texts } = recordingContext();
      drawTemplateLabels(context);
      const drawn = texts.map(entry => entry.text);
      assert.ok(drawn.includes(title), `${language} section title`);
      assert.ok(drawn.includes(chart), `${language} header`);
      assert.ok(texts.every(entry => !CYRILLIC.test(entry.text)), `${language} leaves no Ukrainian text`);
      // Section titles and the left-column headings are bold, as on the reference.
      assert.match(texts.find(entry => entry.text === title).font, /bold/);
      assert.ok(texts.some(entry => /bold/.test(entry.font)) && texts.some(entry => !/bold/.test(entry.font)));
      // The influence factor legend is printed under the chart.
      assert.ok(drawn.some(text => text.startsWith('Alkohol (A)') || text.startsWith('Alcohol (A)')));
    }
    setLanguage('uk');
    const { context, texts } = recordingContext();
    drawTemplateLabels(context);
    // The reference is Ukrainian: its own printed labels stay untouched.
    assert.equal(texts.length, 0);
  } finally { setLanguage('en'); }
});

test('form rows mark days the way the reference sample is filled in', () => {
  try {
    setLanguage('en');
    const context = { codes: formCodes(), usualTime: '06:00' };
    const row = key => FORM_ROWS.find(([name]) => name === key)[2];
    assert.equal(row('Other measurement time')({ measurementTime: '09:00' }, context), 'V');
    assert.equal(row('Other measurement time')({ measurementTime: '06:25' }, context), '');
    assert.equal(row('Other measurement time')({}, context), '');
    assert.equal(row('Factors affecting BBT')({ tempFactors: 'stress' }, context), 'S');
    assert.equal(row('Clots')({ sediment: true }, context), 'X');
    assert.equal(row('Clots')({ sediment: false }, context), '');
    assert.equal(row('Intercourse')({ sex: true }, context), 'X');
    assert.equal(row('Intercourse')({ sex: false }, context), '');
    assert.equal(row('Sensation during the day:')({ sensation: 'wet' }, context), 'W');
    assert.equal(row('Color')({ color: 'whiteTranslucent' }, context), 'WT');
    assert.equal(isOtherMeasurementTime('07:31', '07:00'), true);
    assert.equal(isOtherMeasurementTime('07:30', '07:00'), false);
    assert.equal(isOtherMeasurementTime('07:30', ''), false);
    assert.equal(formDate('2026-11-03'), '03.11');
    setLanguage('cs');
    assert.equal(formMonth(['2026-11-03', '2026-11-30']), 'listopad');
    assert.equal(formMonth(['2026-10-30', '2026-11-02']), 'říjen – listopad');
  } finally { setLanguage('en'); }
});

test('PDF fills the chart like the reference sample: blue entries, circled fertile days, no shading', async () => {
  const { context, texts, arcs, fills } = recordingContext();
  const previousDocument = globalThis.document;
  const previousImage = globalThis.Image;
  globalThis.Image = class { async decode() {} };
  globalThis.document = { createElement: () => ({ getContext: () => context, toBlob: done => done(new Blob([new Uint8Array([255, 216, 255, 217])])) }) };
  setLanguage('en');
  try {
    await mapPdf({
      name: 'Sample', profileSnapshot: { age: 23, usualMeasurementTime: '06:00', measurementMethod: 'vaginal' },
      entries: {
        '2026-04-01': { bleeding: 'menstruation', temp: 36.8 },
        '2026-04-02': { bleeding: 'menstruation', temp: 36.7, sediment: true },
        '2026-04-10': { temp: 36.9, measurementTime: '09:00', isFertile: true, tempFactors: 'stress' },
      },
    });
    const blue = entry => /^#1f4e9e$/i.test(entry.fillStyle);
    const find = text => texts.find(entry => entry.text === text);
    assert.ok(find('April') && blue(find('April')), 'month in words, in blue');
    assert.ok(find('2026') && blue(find('2026')));
    assert.ok(find('23') && blue(find('23')));
    assert.ok(find('01.04') && blue(find('01.04')), 'dates are day.month');
    assert.ok(find('V') && blue(find('V')), 'other measurement time is marked V');
    assert.ok(find('09:00') && blue(find('09:00')), 'its time is written in the chart column');
    assert.ok(texts.filter(entry => entry.text === 'X' && blue(entry)).length >= 3, 'period and clots are crossed');
    assert.ok(find('S') && blue(find('S')), 'factor letter');
    // The fertile day number is circled in the Fertile days row, and the chart is not shaded.
    assert.ok(arcs.some(arc => arc.y > 828 && arc.y < 840 && /^#1f4e9e$/i.test(arc.strokeStyle)));
    assert.equal(fills.some(fill => /rgba\(55, ?130, ?70/.test(fill.fillStyle)), false);
    // The selected method is emphasised among the printed options.
    const method = find('vaginal') || find('Vaginal');
    assert.ok(method && blue(method) && /bold/.test(method.font));
  } finally { globalThis.document = previousDocument; globalThis.Image = previousImage; setLanguage('en'); }
});
