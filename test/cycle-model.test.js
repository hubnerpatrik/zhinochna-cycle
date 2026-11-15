import test from "node:test";
import assert from "node:assert/strict";
import { cycleModel, cycleStarts } from "../cycle-model.js";

test("consecutive period days form one cycle start", () => {
  assert.deepEqual(cycleStarts({
    "2026-06-01": { bleeding: "menstruation" },
    "2026-06-02": { bleeding: "menstruation" },
  }), ["2026-06-01"]);
});

test("separated period entries form separate cycle starts", () => {
  assert.deepEqual(cycleStarts({
    "2026-06-01": { bleeding: "menstruation" },
    "2026-07-01": { bleeding: "menstruation" },
  }), ["2026-06-01", "2026-07-01"]);
});

test("a gap day between period days starts a new cycle", () => {
  assert.deepEqual(cycleStarts({
    "2026-06-01": { bleeding: "menstruation" },
    "2026-06-03": { bleeding: "menstruation" },
  }), ["2026-06-01", "2026-06-03"]);
});

test("consecutive dates across a year boundary remain one period", () => {
  assert.deepEqual(cycleStarts({
    "2026-12-31": { bleeding: "menstruation" },
    "2027-01-01": { bleeding: "menstruation" },
  }), ["2026-12-31"]);
});

test("cycle days count calendar days across the spring DST change", () => {
  const model = cycleModel({ entries: {
    "2026-03-29": { bleeding: "menstruation" },
    "2026-03-30": { bleeding: "menstruation" },
  } });
  assert.deepEqual(model.starts, ["2026-03-29"]);
  assert.equal(model.cycleDay("2026-03-30"), 2);
  assert.equal(model.cycleDay("2026-04-05"), 8);
});

test("cycle day is null and cycle ID is the first cycle before any start", () => {
  const model = cycleModel({ entries: { "2026-08-10": { bleeding: "menstruation" } } });
  assert.equal(model.cycleDay("2026-08-09"), null);
  assert.equal(model.cycleId("2026-08-09"), "cycle-1");
  assert.equal(model.cycleId("2026-08-10"), "cycle-1");
});

test("cycle IDs advance only when a new cycle start occurs", () => {
  const model = cycleModel({ entries: {
    "2026-08-01": { bleeding: "menstruation" },
    "2026-08-02": { bleeding: "menstruation" },
    "2026-08-20": { bleeding: "menstruation" },
  } });
  assert.equal(model.cycleId("2026-08-05"), "cycle-1");
  assert.equal(model.cycleId("2026-08-20"), "cycle-2");
  assert.equal(model.cycleId("2026-08-25"), "cycle-2");
});

test("fertile days merge day flags with the legacy fertile range", () => {
  const model = cycleModel({
    entries: { "2026-09-20": { isFertile: true }, "2026-09-21": { isFertile: false } },
    fertileRange: { start: "2026-09-10", end: "2026-09-12" },
  });
  assert.deepEqual(
    ["2026-09-09", "2026-09-10", "2026-09-12", "2026-09-13", "2026-09-20", "2026-09-21"].map(model.isFertile),
    [false, true, true, false, true, false],
  );
});

test("an incomplete legacy fertile range marks nothing", () => {
  const model = cycleModel({ entries: {}, fertileRange: { start: "2026-09-10", end: null } });
  assert.equal(model.isFertile("2026-09-10"), false);
});
