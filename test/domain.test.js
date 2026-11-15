import test from "node:test";
import assert from "node:assert/strict";
import { MemoryStorage } from "./setup.js";

globalThis.localStorage = new MemoryStorage();
const { store } = await import("../store.js");
const { buildColumns } = await import("../domain.js");
const { sortedMapEntries } = await import("../export-data.js");

test("columns expose all three marker types for the same day", () => {
  store.entries = {
    "2026-08-17": {
      markers: {
        bbt: { value: "P", pointType: "temp" },
        mucus: { value: "1", pointType: "temp" },
        cervix: { value: "3", pointType: "temp" },
      },
    },
  };

  assert.deepEqual(buildColumns()[0].markers, {
    bbt: { value: "P", pointType: "temp" },
    mucus: { value: "1", pointType: "temp" },
    cervix: { value: "3", pointType: "temp" },
  });
});

test("column cycle IDs advance only when a new cycle start occurs", () => {
  store.entries = {
    "2026-08-01": { bleeding: "menstruation" },
    "2026-08-02": { bleeding: "menstruation" },
    "2026-08-05": {},
    "2026-08-20": { bleeding: "menstruation" },
    "2026-08-25": {},
  };
  const ids = Object.fromEntries(buildColumns().map(column => [column.key, column.cycleId]));
  assert.equal(ids["2026-08-05"], "cycle-1");
  assert.equal(ids["2026-08-20"], "cycle-2");
  assert.equal(ids["2026-08-25"], "cycle-2");
});

test("columns number days from the map's first day before any cycle start", () => {
  store.entries = { "2026-09-10": { temp: 36.4 }, "2026-09-12": { bleeding: "menstruation" } };
  assert.deepEqual(buildColumns().map(column => column.cycleDay), [1, 2, 1]);
});

test('charts include unrecorded days and calendar-based cycle numbers without inserting records', () => {
  store.entries = { '2026-10-05': { temp: 36.4, bleeding: 'menstruation' }, '2026-10-07': { temp: 36.6 } };
  const columns = buildColumns();
  assert.deepEqual(columns.map(column => column.key), ['2026-10-05', '2026-10-06', '2026-10-07']);
  assert.deepEqual(columns.map(column => column.cycleDay), [1, 2, 3]);
  assert.equal(columns[1].temp, null);
  assert.equal(Object.hasOwn(store.entries, '2026-10-06'), false);
  store.entries = { '2026-03-28': {}, '2026-03-30': {} };
  assert.deepEqual(buildColumns().map(column => column.key), ['2026-03-28', '2026-03-29', '2026-03-30']);
});

test("the chart and exports agree on fertile days, including the legacy fertile range", () => {
  const map = {
    entries: {
      "2026-11-01": { temp: 36.4 },
      "2026-11-02": { temp: 36.5 },
      "2026-11-03": { temp: 36.6, isFertile: true },
      "2026-11-04": { temp: 36.7 },
    },
    fertileRange: { start: "2026-11-01", end: "2026-11-02" },
  };
  store.entries = map.entries;
  store.fertileRange = map.fertileRange;
  try {
    const onScreen = buildColumns().filter(column => column.isFertile).map(column => column.key);
    const exported = sortedMapEntries(map).filter(([, entry]) => entry.isFertile).map(([date]) => date);
    assert.deepEqual(onScreen, ["2026-11-01", "2026-11-02", "2026-11-03"]);
    assert.deepEqual(exported, onScreen);
    assert.equal(Object.hasOwn(map.entries["2026-11-01"], "isFertile"), false, "exports must not rewrite stored days");
  } finally {
    store.fertileRange = { start: null, end: null };
  }
});
