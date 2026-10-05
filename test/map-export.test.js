import test from 'node:test';
import assert from 'node:assert/strict';
import { csvCell, mapCsv, exportFilename, jpegPagesPdf, observationText } from '../map-export.js';
import { setLanguage } from '../i18n.js';

test('PDF observations format temperatures and translate enums without translating user notes', () => {
  setLanguage('cs');
  assert.equal(observationText('temp', 36.300000000000004), '36.30 °C');
  assert.equal(observationText('bleeding', 'menstruation'), 'Menstruace');
  assert.equal(observationText('other', 'Save'), 'Save');
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
