import test from 'node:test';
import assert from 'node:assert/strict';
import { mapXlsx, jpegPagesPdf } from '../map-export.js';
import { exportMap, readImportText, readMapImport } from '../map-transfer.js';
import { parseBackup, serializeBackup, serializeMapBackup } from '../backup.js';
import { templatePages } from '../observation-template.js';
import { setLanguage } from '../i18n.js';
import { drawTemplateLabels } from '../pdf-template-labels.js';

const map = { id: 'sample', name: 'Žluťoučký цикл', entries: {
  '2026-10-01': { temp: 36.5, sex: false, bleeding: 'menstruation', other: 'First\nsecond <line>' },
  '2026-10-03': { temp: 36.7, isFertile: true },
}, coverlines: { default: { horizontalTemp: 36.4 } }, cycleSummaries: { '2026-10-01': { mucusPeak: 13 } } };

function storedZipParts(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const parts = new Map();
  let offset = 0;
  while (view.getUint32(offset, true) === 0x04034b50) {
    assert.equal(view.getUint16(offset + 8, true), 0);
    const size = view.getUint32(offset + 18, true);
    const nameLength = view.getUint16(offset + 26, true), extraLength = view.getUint16(offset + 28, true);
    const start = offset + 30 + nameLength + extraLength;
    parts.set(new TextDecoder().decode(bytes.slice(offset + 30, offset + 30 + nameLength)), new TextDecoder().decode(bytes.slice(start, start + size)));
    offset = start + size;
  }
  return parts;
}

test('Excel package declares the content type of every part, including the embedded backup', () => {
  const parts = storedZipParts(mapXlsx(map));
  const types = parts.get('[Content_Types].xml');
  const defaults = new Map([...types.matchAll(/<Default Extension="([^"]+)" ContentType="([^"]+)"\s*\/>/g)].map(match => [match[1], match[2]]));
  const overrides = new Set([...types.matchAll(/<Override PartName="([^"]+)"/g)].map(match => match[1]));
  assert.equal(defaults.get('json'), 'application/json');
  for (const name of parts.keys()) {
    if (name === '[Content_Types].xml') continue;
    assert.ok(overrides.has('/' + name) || defaults.has(name.split('.').at(-1)), `Missing content type: ${name}`);
  }
  const workbook = parts.get('xl/workbook.xml');
  const views = [...workbook.matchAll(/<workbookView(?:\s[^>]*)?\s*\/>/g)];
  assert.ok(views.length > 0);
  assert.ok(workbook.indexOf('<bookViews>') < workbook.indexOf('<sheets>'));
  for (const [name, content] of parts) {
    if (!/^xl\/worksheets\/sheet\d+\.xml$/.test(name)) continue;
    for (const [, index] of content.matchAll(/workbookViewId="(\d+)"/g)) assert.ok(Number(index) < views.length, `Invalid view in ${name}`);
  }
});

test('Excel imports all data, metadata and annotations without changing JSON backup format', async () => {
  const backup = serializeMapBackup(map);
  const bytes = mapXlsx(map, backup);
  const imported = await readMapImport(new File([bytes], 'map.xlsx'));
  assert.deepEqual(imported, parseBackup(backup));
  const text = new TextDecoder().decode(bytes);
  assert.match(text, /scatterChart/);
  assert.match(text, /<c:min val="36"/);
  assert.match(text, /<c:dispBlanksAs val="gap"/);
  assert.match(text, /<c:delete val="0"/);
  assert.match(text, /<c:tickLblPos val="nextTo"/);
  assert.match(text, /<c:varyColors val="0"/);
  assert.match(text, /name="Cycle map 1"/);
  assert.match(text, /name="Data"/);
});

test('Excel labels and observation values follow all four application languages; user notes stay literal', () => {
  try {
    for (const [language, date, period, sheet] of [
      ['en', 'Date', 'Period', 'Cycle map 1'], ['cs', 'Datum', 'Menstruace', 'Mapa cyklu 1'],
      ['sk', 'Dátum', 'Menštruácia', 'Mapa cyklu 1'], ['uk', 'Дата', 'Менструація', 'Карта циклу 1'],
    ]) {
      setLanguage(language);
      const text = new TextDecoder().decode(mapXlsx(map));
      assert.ok(text.includes(`>${date}</t>`));
      assert.ok(text.includes(`>${period}</t>`));
      assert.ok(text.includes(`name="${sheet}"`));
      assert.ok(text.includes('First\nsecond &lt;line&gt;'));
      assert.ok(text.includes('$B$25:$AR$25'));
    }
  } finally { setLanguage('en'); }
});

test('PDF reference labels are repainted in the selected application language', () => {
  try {
    for (const [language, expected] of [['en', 'Map name'], ['cs', 'Název mapy'], ['sk', 'Názov mapy'], ['uk', 'Назва карти']]) {
      setLanguage(language);
      const labels = [];
      drawTemplateLabels({ fillRect() {}, strokeRect() {}, measureText: value => ({ width: value.length }), fillText: value => labels.push(value) });
      assert.ok(labels.includes(expected));
      if (language !== 'uk') assert.ok(labels.every(value => !/[\u0400-\u04ff]/.test(value)));
    }
  } finally { setLanguage('en'); }
});

test('PDF contains a real JSON attachment and a browser-readable recovery copy', async () => {
  const backup = serializeMapBackup(map);
  const bytes = jpegPagesPdf([new Uint8Array([255,216,255,217])], undefined, undefined, backup);
  assert.match(new TextDecoder().decode(bytes), /\/EmbeddedFiles/);
  const imported = await readMapImport(new File([bytes], 'map.PDF'));
  assert.deepEqual(imported, parseBackup(backup));
});

test('JSON import stays byte-for-byte unchanged and foreign formats fail explicitly', async () => {
  const backup = serializeMapBackup(map);
  assert.equal(await readImportText(new File([backup], 'map.json')), backup);
  await assert.rejects(readMapImport(new File(['%PDF-1.4'], 'scan.pdf')), /contains no import data/);
  await assert.rejects(readMapImport(new File(['garbage'], 'map.xlsx')));
  await assert.rejects(readMapImport(new File(['garbage'], 'map.doc')), /Supported import formats/);
});

test('template retains calendar gaps, splits cycles and continues after day 43', () => {
  const pages = templatePages({ entries: { '2026-01-01': { bleeding: 'menstruation' }, '2026-02-20': {}, '2026-03-01': { bleeding: 'menstruation' } } });
  assert.equal(pages.length, 3);
  assert.equal(pages[0].dates.length, 43);
  assert.equal(pages[1].offset, 43);
  assert.equal(pages[1].dates[0], '2026-02-13');
  assert.equal(pages[2].offset, 0);
});

test('every export format names its file and type; all but CSV embed the backup', async () => {
  const exported = {};
  const dated = { ...map, createdAt: '2026-10-01T00:00:00.000Z' };
  for (const format of ['json', 'xlsx', 'csv']) exported[format] = await exportMap(dated, format, { accountProfile: { name: 'Author' } });
  assert.equal(exported.json.mimeType, 'application/json');
  assert.match(exported.json.filename, /^cycle-tracker-.+-backup-\d{4}-\d{2}-\d{2}\.json$/);
  assert.equal(exported.xlsx.filename, 'Žluťoučký цикл.xlsx');
  assert.equal(exported.csv.mimeType, 'text/csv;charset=utf-8');
  const fromJson = await readMapImport(new File([exported.json.contents], 'map.json'));
  const fromXlsx = await readMapImport(new File([exported.xlsx.contents], 'map.xlsx'));
  assert.deepEqual(fromXlsx.maps, fromJson.maps);
  assert.equal(fromJson.profile.name, 'Author', 'maps without a snapshot carry the account profile');
  await assert.rejects(exportMap(map, 'docx'), /Unsupported export format/);
});

test('the store and export module build the same map backup', async () => {
  const { MemoryStorage } = await import('./setup.js');
  globalThis.localStorage ??= new MemoryStorage();
  const { Store } = await import('../store.js');
  const { LocalStorageAdapter } = await import('../storage/local-storage-adapter.js');
  const store = new Store(new LocalStorageAdapter(new MemoryStorage(), 'transfer:'));
  store.saveProfile({ name: 'Owner' });
  const created = store.createMap('Shared');
  store.updateEntry('2026-10-01', { temp: 36.5 });
  store.save();
  const exportedAt = '2026-11-15T10:00:00.000Z';
  const { contents } = await exportMap(store.getMap(created.id), 'json', {
    accountProfile: store.getProfile(), active: true, exportedAt,
  });
  assert.equal(contents, store.createMapBackup(created.id, exportedAt));
});

test('map imports accept exactly one map', async () => {
  const twoMaps = serializeBackup({ profile: {}, maps: {
    a: { id: 'a', name: 'A', entries: {} }, b: { id: 'b', name: 'B', entries: {} },
  }, activeMapId: null });
  await assert.rejects(readMapImport(new File([twoMaps], 'maps.json')), /exactly one map/);
});
