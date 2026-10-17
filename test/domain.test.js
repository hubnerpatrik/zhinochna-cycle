import test from "node:test";
import assert from "node:assert/strict";
import { MemoryStorage } from "./setup.js";

globalThis.localStorage = new MemoryStorage();
const { store } = await import("../store.js");
const { parseDateKey } = await import("../core.js");
const { buildColumns, getCycleStartDates, resolveCycleDay, resolveCycleId } = await import("../domain.js");

function cycleKeys(entries) {
  store.entries = entries;
  return getCycleStartDates().map(date => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  });
}

test("consecutive period days form one cycle start", () => {
  assert.deepEqual(cycleKeys({
    "2026-06-01": { bleeding: "menstruation" },
    "2026-06-02": { bleeding: "menstruation" },
  }), ["2026-06-01"]);
});

test("separated period entries form separate cycle starts", () => {
  assert.deepEqual(cycleKeys({
    "2026-06-01": { bleeding: "menstruation" },
    "2026-07-01": { bleeding: "menstruation" },
  }), ["2026-06-01", "2026-07-01"]);
});

test("consecutive dates across a year boundary remain one period", () => {
  assert.deepEqual(cycleKeys({
    "2026-12-31": { bleeding: "menstruation" },
    "2027-01-01": { bleeding: "menstruation" },
  }), ["2026-12-31"]);
});

test("consecutive dates across the spring DST change remain one period", () => {
  assert.deepEqual(cycleKeys({
    "2026-03-29": { bleeding: "menstruation" },
    "2026-03-30": { bleeding: "menstruation" },
  }), ["2026-03-29"]);
  assert.equal(
    resolveCycleDay(parseDateKey("2026-03-30"), [parseDateKey("2026-03-29")], 1),
    2,
  );
});

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

test("cycle IDs advance only when a new cycle start occurs", () => {
  store.entries = {
    "2026-08-01": { bleeding: "menstruation" },
    "2026-08-02": { bleeding: "menstruation" },
    "2026-08-20": { bleeding: "menstruation" },
  };

  const starts = getCycleStartDates();
  assert.equal(resolveCycleId(new Date(2026, 7, 5), starts), "cycle-1");
  assert.equal(resolveCycleId(new Date(2026, 7, 20), starts), "cycle-2");
  assert.equal(resolveCycleId(new Date(2026, 7, 25), starts), "cycle-2");
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
