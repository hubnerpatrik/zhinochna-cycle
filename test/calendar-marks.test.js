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

test("day titles show the date in words with the cycle day, also after the last record", async () => {
  const { store } = await import("../store.js");
  const { setDayTitle } = await import("../ui/modal-shared.js");
  const { setLanguage } = await import("../i18n.js");
  store.entries = { "2026-11-01": { bleeding: "menstruation" }, "2026-11-03": { temp: 36.4 } };
  const element = () => {
    const attributes = {};
    return { textContent: "", setAttribute(key, value) { attributes[key] = value; }, removeAttribute(key) { delete attributes[key]; }, attributes };
  };
  const title = element();
  setDayTitle(title, "2026-11-19");
  assert.equal(title.textContent, "19 November 2026 (CD 19)");
  setLanguage("cs", { setItem() {} });
  setDayTitle(title, "2026-11-03", [{ key: "2026-11-03", cycleDay: 3 }]);
  assert.equal(title.textContent, "3. listopadu 2026 (DC 3)");
  setLanguage("en", { setItem() {} });
  store.entries = { "2026-11-03": { temp: 36.4 } };
  setDayTitle(title, "2026-11-04");
  assert.equal(title.textContent, "4 November 2026 (CD -)", "before any recorded cycle start");
});
