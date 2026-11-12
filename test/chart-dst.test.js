// Runs in its own process, so the timezone applies to every Date created below.
process.env.TZ = "Europe/Prague";

import test from "node:test";
import assert from "node:assert/strict";
import { MemoryStorage } from "./setup.js";

globalThis.localStorage = new MemoryStorage();
const { drawTemperatureLine } = await import("../chart.js");

function dashRecorder() {
  const dashes = [];
  return {
    dashes,
    beginPath() {}, moveTo() {}, lineTo() {}, stroke() {},
    setLineDash(pattern) { dashes.push(pattern.length > 0); },
  };
}

function segmentDashes(keys) {
  const columns = keys.map((key, index) => {
    const [year, month, day] = key.split("-").map(Number);
    return { key, date: new Date(year, month - 1, day), temp: 36.4, centerX: index * 50 };
  });
  const context = dashRecorder();
  drawTemperatureLine(context, [{ columns }]);
  // Each segment sets its dash; the final call resets it after the group.
  return context.dashes.slice(0, -1);
}

test("consecutive days across the autumn clock change stay solid", () => {
  assert.equal(new Date(2026, 9, 26) - new Date(2026, 9, 25), 25 * 3_600_000);
  assert.deepEqual(segmentDashes(["2026-10-24", "2026-10-25", "2026-10-26", "2026-10-27"]), [false, false, false]);
});

test("consecutive days across the spring clock change stay solid", () => {
  assert.deepEqual(segmentDashes(["2026-03-28", "2026-03-29", "2026-03-30"]), [false, false]);
});

test("a missing measurement day is still dashed across a clock change", () => {
  assert.deepEqual(segmentDashes(["2026-10-24", "2026-10-26"]), [true]);
});
