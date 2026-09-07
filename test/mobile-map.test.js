import test from "node:test";
import assert from "node:assert/strict";
import { MemoryStorage } from "./setup.js";

globalThis.localStorage = new MemoryStorage();
const { fittedColumnWidth } = await import("../active-map/mobile-map.js");

test("phone overview keeps short and long maps within the viewport, reserving the axis", () => {
  for (const viewport of [286, 356, 396]) {
    for (const days of [1, 28, 90, 1000]) {
      const width = fittedColumnWidth(viewport, days);
      assert.ok(width > 0);
      assert.ok(Math.abs(width * days + 50 - viewport) < 0.001);
    }
  }
  assert.ok(Number.isFinite(fittedColumnWidth(286, 0)));
});
