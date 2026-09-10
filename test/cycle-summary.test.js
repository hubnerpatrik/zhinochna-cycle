import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCycleHistory, calculateSummary, cycleStarts } from '../cycle-summary.js';
import { normalizeMap } from '../data-validation.js';

test('calendar days survive DST; phase counting includes first BBT day but excludes mucus peak', () => {
  const entries = {
    '2026-03-15': { bleeding: 'menstruation' },
    '2026-03-16': { bleeding: 'menstruation' },
    '2026-03-28': { markers: { bbt: { value: '1' } } },
    '2026-03-30': { markers: { bbt: { value: '3' } } },
    '2026-04-12': { bleeding: 'menstruation' },
  };
  assert.equal(cycleStarts(entries).length, 2);
  const result = calculateSummary(entries, '2026-03-15', { mucusPeak: 13 });
  assert.equal(result.length, 28);
  assert.equal(result.bbtPhase, 15);
  assert.equal(result.mucusPhase, 15);
  assert.equal(result.mucusPlus4, 17);
  assert.equal(result.bbtRise, 16);
  assert.equal(calculateSummary(entries, '2026-04-12').length, null);
});

test('history excludes current cycle and requires the selected sample size', () => {
  const entries = {};
  const start = Date.UTC(2025, 0, 1);
  const keys = Array.from({ length: 13 }, (_, index) => new Date(start + index * 27 * 86400000).toISOString().slice(0, 10));
  keys.forEach(key => { entries[key] = { bleeding: 'menstruation' }; });
  assert.equal(calculateSummary(entries, keys[5]).lastInfertile, null);
  assert.equal(calculateSummary(entries, keys[6]).lastInfertile, 6);
  assert.equal(calculateSummary(entries, keys[12], { historyCount: 12 }).lastInfertile, 7);
});

test('manual summaries survive backup normalization and reject invalid input', () => {
  const map = { cycleSummaries: { '2026-03-15': { mucusPeak: 13, qualityDays: 0, historyCount: 12 } } };
  assert.equal(normalizeMap(map, 'm').cycleSummaries['2026-03-15'].mucusPeak, 13);
  assert.equal(normalizeMap(map, 'm').cycleSummaries['2026-03-15'].qualityDays, 0);
  assert.throws(() => normalizeMap({ cycleSummaries: { '2026-03-15': { mucusPeak: -1 } } }, 'm', '', { strict: true }));
});

function historyFixture() {
  const date = offset => new Date(Date.UTC(2025, 0, 1) + offset * 86400000).toISOString().slice(0, 10);
  const maps = {};
  for (let cycle = 0; cycle <= 12; cycle++) {
    const entries = {};
    for (let day = 0; day < 27; day++) {
      entries[date(cycle * 27 + day)] = { bleeding: day < 3 ? 'menstruation' : 'none' };
    }
    maps[`m${cycle}`] = { id: `m${cycle}`, entries, profileSnapshotLocked: false };
  }
  return { maps, date };
}

test('one cycle per map contributes to six and twelve-cycle statistics, closing on the next map', () => {
  const { maps, date } = historyFixture();
  const history = buildCycleHistory(maps, 'm12');
  const six = calculateSummary(maps.m12.entries, date(324), {}, history);
  assert.equal(six.available, 6);
  assert.equal(six.lastInfertile, 6);
  const twelve = calculateSummary(maps.m12.entries, date(324), { historyCount: 12 }, history);
  assert.equal(twelve.available, 12);
  assert.equal(twelve.lastInfertile, 7);
  assert.equal(twelve.length, null);
  assert.equal(calculateSummary(maps.m0.entries, date(0), {}, history).length, 27);
  assert.equal(calculateSummary(maps.m5.entries, date(135), {}, history).available, 5);
});

test('duplicate maps count once; imported maps neither contaminate nor borrow owner history', () => {
  const { maps, date } = historyFixture();
  maps.copy = structuredClone(maps.m0);
  maps.shared = { profileSnapshotLocked: true, entries: {
    [date(2)]: { bleeding: 'none' },
    [date(9)]: { bleeding: 'menstruation' },
  } };
  assert.equal(buildCycleHistory(maps, 'm12').length, 12);
  assert.ok(buildCycleHistory(maps, 'm12').every(cycle => cycle.length === 27));
  assert.equal(buildCycleHistory(maps, 'shared').length, 0);
});

test('a missing map blocks the formula instead of becoming a long cycle or using older cycles', () => {
  const { maps, date } = historyFixture();
  delete maps.m9;
  const history = buildCycleHistory(maps, 'm12');
  const result = calculateSummary(maps.m12.entries, date(324), {}, history);
  assert.equal(result.historyIncomplete, true);
  assert.equal(result.lastInfertile, null);
  assert.equal(result.max, 27);
  assert.ok(history.some(cycle => cycle.issue === 'gap' && cycle.length === null));
});

test('conflicting overlap blocks history; correcting or deleting that map recalculates it', () => {
  const { maps, date } = historyFixture();
  maps.conflict = { entries: { [date(270)]: { bleeding: 'none' } } };
  assert.equal(calculateSummary(maps.m12.entries, date(324), {}, buildCycleHistory(maps, 'm12')).lastInfertile, null);
  delete maps.conflict;
  assert.equal(calculateSummary(maps.m12.entries, date(324), {}, buildCycleHistory(maps, 'm12')).lastInfertile, 6);
});

test('consecutive period days split across maps remain one start', () => {
  const maps = {
    a: { entries: { '2026-01-01': { bleeding: 'menstruation' } } },
    b: { entries: { '2026-01-02': { bleeding: 'menstruation' }, '2026-01-03': { bleeding: 'none' }, '2026-01-04': { bleeding: 'menstruation' } } },
  };
  assert.deepEqual(buildCycleHistory(maps, 'a'), [{ start: '2026-01-01', end: '2026-01-04', length: 3, issue: null }]);
});
