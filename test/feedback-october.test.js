import test from 'node:test';
import assert from 'node:assert/strict';
import { formatMonthPeriod } from '../month-period.js';
import { setLanguage, setMonthPeriod, t, translateDOM } from '../i18n.js';
import { chartPointY, chartY, LAYOUT } from '../core.js';
import { MemoryStorage } from './setup.js';
import { LocalStorageAdapter } from '../storage/local-storage-adapter.js';
import { parseBackup } from '../backup.js';
globalThis.localStorage = new MemoryStorage();
const { Store } = await import('../store.js');
const { drawTemperatureLine, drawTemperaturePoints, drawAdjustedTemperaturePoints } = await import('../chart.js');
const { pixelToPointColumnHit } = await import('../active-map/chart-interactions.js');

test('map period covers a single month, multiple months, years and an empty map', () => {
  assert.equal(formatMonthPeriod('2026-09-01','2026-09-30'),'2026 September');
  assert.equal(formatMonthPeriod('2026-09-21','2026-10-20'),'2026 September – October');
  assert.equal(formatMonthPeriod('2026-12-21','2027-01-19'),'2026 December – 2027 January');
  assert.equal(formatMonthPeriod(null,null),'');
  assert.equal(formatMonthPeriod('2026-09-21','2026-10-20','sk-SK'),'2026 september – október');
});

test('map period retranslates after changing language and resets for a different empty map', () => {
  const attributes = {};
  const element = { textContent: '', setAttribute(k,v) { attributes[k]=v; }, getAttribute: k => attributes[k] ?? null, hasAttribute: k => k in attributes, matches: () => true, querySelectorAll: () => [] };
  setLanguage('en');
  setMonthPeriod(element,['2026-10-20','2026-09-21']);
  assert.equal(element.textContent,'2026 September – October');
  setLanguage('uk'); translateDOM(element);
  assert.equal(element.textContent,'2026 вересень – жовтень');
  assert.equal(t('Date'),'Дата'); assert.equal(t('Travel'),'Дорога');
  setMonthPeriod(element,[]); assert.equal(element.textContent,'');
  setLanguage('en');
});

test('illness temperatures survive saving, reload and backup without expanding the chart scale', () => {
  const persistence = new LocalStorageAdapter(new MemoryStorage(),'test-illness:');
  const store = new Store(persistence);
  const map=store.createMap('Illness');
  store.updateEntry('2026-10-21',{temp:38.65,tempFactors:'illness'}); store.save();
  assert.equal(new Store(persistence).getMap(map.id).entries['2026-10-21'].temp,38.65);
  assert.equal(parseBackup(store.createMapBackup(map.id)).maps[map.id].entries['2026-10-21'].temp,38.65);
  assert.equal(LAYOUT.maxTemp,37.4);
  assert.equal(chartPointY(38.65),chartY(37.4));
  assert.deepEqual(pixelToPointColumnHit(25,chartPointY(38.65),[{key:'2026-10-21',centerX:25,temp:38.65}]),{key:'2026-10-21',type:'temp'});
});

test('out-of-scale readings are labelled at the boundary and are not joined as normal graph points', () => {
  const paths=[],labels=[];
  const ctx={beginPath(){},moveTo(...p){paths.push(p);},lineTo(...p){paths.push(p);},closePath(){},fill(){},stroke(){},setLineDash(){},arc(){},fillText(...p){labels.push(p);}};
  const columns=[{temp:36.5,centerX:25,date:new Date(2026,9,20)},{temp:38.65,adjustedTemp:38.53,centerX:75,date:new Date(2026,9,21)},{temp:36.7,centerX:125,date:new Date(2026,9,22)}];
  drawTemperatureLine(ctx,[{columns}]); assert.equal(paths.length,0);
  drawTemperaturePoints(ctx,columns);
  drawAdjustedTemperaturePoints(ctx,columns);
  assert.equal(labels.length,1);
  assert.equal(labels[0][0],'38.65°');
  assert.ok(paths.every(([,y])=>y>=0&&y<=LAYOUT.chartHeight));
});
