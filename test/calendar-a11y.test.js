import test from "node:test";
import assert from "node:assert/strict";
import { MemoryStorage } from "./setup.js";

globalThis.localStorage = new MemoryStorage();
const { calendarDayLabelSource, calendarArrowTarget } = await import("../ui/calendar.js");
const { t, setLanguage } = await import("../i18n.js");

test("a day label names the date, cycle day and every observation shown by colour or dot", () => {
  assert.equal(calendarDayLabelSource("2026-11-17", undefined, null, false), "@2026-11-17");
  assert.equal(
    calendarDayLabelSource("2026-11-17", { bleeding: "menstruation", sex: true, tempFactors: "illness", other: "x" }, 22, true),
    "@2026-11-17 · Cycle day 22 · Menstruation · Fertile · Influence factors · Sex · Additional symptoms",
  );
  assert.equal(calendarDayLabelSource("2026-11-02", { bleeding: "spotting" }, 1, false), "@2026-11-02 · Cycle day 1 · Spotting");
});

test("a day label is spoken in the app language with the date in words", () => {
  const source = "@2026-11-17 · Cycle day 22 · Menstruation · Sex";
  setLanguage("en", { setItem() {} });
  assert.equal(t(source), "17 November 2026 · Cycle day 22 · Menstruation · Sex");
  setLanguage("cs", { setItem() {} });
  assert.equal(t(source), "17. listopadu 2026 · Den cyklu 22 · Menstruace · Pohlavní styk");
  setLanguage("en", { setItem() {} });
});

test("arrow keys move one day or one week, Home and End jump to the month edges", () => {
  assert.equal(calendarArrowTarget(10, 30, "ArrowRight"), 11);
  assert.equal(calendarArrowTarget(10, 30, "ArrowLeft"), 9);
  assert.equal(calendarArrowTarget(10, 30, "ArrowDown"), 17);
  assert.equal(calendarArrowTarget(10, 30, "ArrowUp"), 3);
  assert.equal(calendarArrowTarget(10, 30, "Home"), 1);
  assert.equal(calendarArrowTarget(10, 30, "End"), 30);
  assert.equal(calendarArrowTarget(1, 30, "ArrowLeft"), 1, "stays inside the month");
  assert.equal(calendarArrowTarget(28, 30, "ArrowDown"), 30);
  assert.equal(calendarArrowTarget(3, 30, "ArrowUp"), 1);
  assert.equal(calendarArrowTarget(10, 30, "Tab"), null);
});
