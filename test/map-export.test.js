import test from 'node:test';
import assert from 'node:assert/strict';
import { csvCell, mapCsv, mapXlsx, mapPdf, exportFilename, jpegPagesPdf, observationText } from '../map-export.js';
import { setLanguage } from '../i18n.js';

test('PDF keeps illness readings inside the chart and retains their actual value in observations', async () => {
  const paths = [], dots = [], texts = [];
  const context = {
    fillRect() {}, rect() {}, clip() {}, beginPath() {}, stroke() {}, fill() {}, save() {}, restore() {}, translate() {}, rotate() {}, setLineDash() {},
    moveTo(x,y) { paths.push([x,y]); }, lineTo(x,y) { paths.push([x,y]); },
    arc(x,y) { dots.push([x,y]); }, fillText(text) { texts.push(String(text)); },
    measureText(text) { return { width: String(text).length * 10 }; },
  };
  const previousDocument = globalThis.document;
  globalThis.document = { createElement: () => ({ getContext: () => context, toBlob: done => done(new Blob([new Uint8Array([255,216,255,217])])) }) };
  setLanguage('en');
  try {
    const result = await mapPdf({name:'Synthetic illness',entries:{'2026-10-20':{temp:36.5},'2026-10-21':{temp:38.65},'2026-10-22':{temp:36.7}}});
    assert.ok(result.length > 0);
    assert.equal(dots.length,2);
    assert.ok(paths.every(([,y]) => y >= 190 - 1e-8 && y <= 790 + 1e-8));
    assert.ok(texts.some(text => text.includes('↑ 38.65°')));
    assert.ok(texts.some(text => text.includes('38.65 °C')));
  } finally { globalThis.document = previousDocument; }
});

test('PDF observations format temperatures and translate enums without translating user notes', () => {
  setLanguage('cs');
  assert.equal(observationText('temp', 36.300000000000004), '36.30 °C');
  assert.equal(observationText('bleeding', 'menstruation'), 'Menstruace');
  assert.equal(observationText('other', 'Save'), 'Save');
  assert.equal(observationText('visible', true), 'Přítomen');
  assert.equal(observationText('visible', false), 'Žádné');
  setLanguage('en');
});

test('CSV keeps dates ordered, zero/false, Czech text, commas, quotes and multiline notes', () => {
  const csv = mapCsv({ entries: { '2026-10-02': { temp: 36.55, sex: false, other: 'Žluťoučký, "text"\nřádek' }, '2026-10-01': { temp: 36.1 } } });
  assert.ok(csv.startsWith('\uFEFF"date"'));
  assert.ok(csv.indexOf('2026-10-01') < csv.indexOf('2026-10-02'));
  assert.ok(csv.includes('"false"'));
  assert.ok(csv.includes('"Žluťoučký, ""text""\nřádek"'));
  assert.equal(csvCell(0), '"0"'); assert.equal(csvCell(null), '""');
});
test('CSV neutralizes spreadsheet formulas and filenames cannot contain path separators', () => {
  for (const value of ['=1+1', '+cmd', '-cmd', '@SUM(A1)', '  =SUM(A1)', '\t=1', '\n=1']) assert.ok(csvCell(value).startsWith('"\''));
  assert.equal(exportFilename('../a:b/c', 'pdf'), '..-a-b-c.pdf');
});
test('PDF byte offsets point to all objects even with binary JPEG data', () => {
  const pdf = jpegPagesPdf([new Uint8Array([255, 216, 0, 128, 255, 217]), new Uint8Array([255, 216, 255, 217])]);
  const text = Buffer.from(pdf).toString('latin1');
  assert.ok(text.startsWith('%PDF-1.4')); assert.match(text, /\/Count 2/);
  const start = Number(/startxref\n(\d+)/.exec(text)[1]); assert.equal(text.slice(start, start + 4), 'xref');
  const offsets = [...text.matchAll(/(\d{10}) 00000 n/g)].map(match => Number(match[1]));
  offsets.forEach((offset, i) => assert.ok(text.slice(offset).startsWith(`${i + 1} 0 obj`)));
});

test('Excel uses native numbers, booleans and literal strings, never formulas; new observations are exported', () => {
  const bytes = mapXlsx({ entries: { '2026-10-17': { temp: 36.5, sex: false, other: '=SUM(A1:A2) & <text>\nřádek', bleedingIntensity: 'heavy', tempFactorsOther: 'Vlastní faktor' } } });
  assert.equal(new DataView(bytes.buffer).getUint32(0, true), 0x04034b50);
  const xml = new TextDecoder().decode(bytes);
  assert.match(xml, /<c r="B2"><v>36.5<\/v><\/c>/);
  assert.match(xml, /t="b"><v>0<\/v>/);
  assert.ok(xml.includes('=SUM(A1:A2) &amp; &lt;text&gt;\nřádek'));
  assert.equal(xml.includes('<f>'), false);
  assert.ok(xml.includes('heavy'));
  assert.ok(xml.includes('Vlastní faktor'));
});
