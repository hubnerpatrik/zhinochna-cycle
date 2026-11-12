import test from "node:test";
import assert from "node:assert/strict";
import { MemoryStorage } from "./setup.js";

globalThis.localStorage = new MemoryStorage();
const { calendarDayMarks } = await import("../ui/calendar.js");

test("calendar dots mark influence factors, sex and additional symptoms only when recorded", () => {
  assert.deepEqual(calendarDayMarks(undefined), []);
  assert.deepEqual(calendarDayMarks({ temp: 36.5, bleeding: "menstruation" }), []);
  assert.deepEqual(calendarDayMarks({ tempFactors: "restlessSleep" }), ["factor"]);
  assert.deepEqual(calendarDayMarks({ tempFactors: "", sex: false, other: "   " }), []);
  assert.deepEqual(calendarDayMarks({ tempFactors: "other", sex: true, other: "Headache" }), ["factor", "sex", "other"]);
});
