// cycle-model.js — Cycle starts, cycle days and fertile days for one map
// ─────────────────────────────────────────────
// Pure: works on "YYYY-MM-DD" keys and never reads the store, so the chart,
// the calendars, the cycle summary and every export answer the same way.

import { ISO_DATE_KEY_LENGTH, MILLISECONDS_PER_DAY } from './date-utils.js';

const dayNumber = key => Date.parse(`${key}T00:00:00Z`) / MILLISECONDS_PER_DAY;
const previousDayKey = key => new Date((dayNumber(key) - 1) * MILLISECONDS_PER_DAY)
  .toISOString().slice(0, ISO_DATE_KEY_LENGTH);

/** Recorded menstruation days whose previous calendar day is not a recorded menstruation day. */
export function cycleStarts(entries = {}) {
  return Object.keys(entries).sort().filter(key => entries[key]?.bleeding === 'menstruation'
    && entries[previousDayKey(key)]?.bleeding !== 'menstruation');
}

/**
 * Answers cycle questions for one map. Fertile days come from each day's
 * `isFertile` flag and from the legacy fertile range that older maps store;
 * the range is read here and never rewritten.
 */
export function cycleModel({ entries = {}, fertileRange = null } = {}) {
  const starts = cycleStarts(entries);
  const legacyRange = fertileRange?.start && fertileRange?.end ? fertileRange : null;
  const startIndex = key => starts.findLastIndex(start => start <= key);

  return {
    starts,
    /** 1-based day within the cycle; null before the first cycle start. */
    cycleDay(key) {
      const index = startIndex(key);
      return index < 0 ? null : dayNumber(key) - dayNumber(starts[index]) + 1;
    },
    /** Stable ID such as "cycle-2"; days before the first start belong to "cycle-1". */
    cycleId(key) {
      return `cycle-${startIndex(key) + 1 || 1}`;
    },
    isFertile(key) {
      return entries[key]?.isFertile === true
        || Boolean(legacyRange && key >= legacyRange.start && key <= legacyRange.end);
    },
  };
}
