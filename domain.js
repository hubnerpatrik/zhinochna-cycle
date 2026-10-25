// domain.js — Cycle detection and column building
// ─────────────────────────────────────────────
// Owns all cycle logic: detecting cycle starts,
// resolving cycle IDs and cycle-day numbers,
// and building the column array consumed by render.

import { normalizeDayMarkers, store } from "./store.js";
import { ISO_DATE_KEY_LENGTH, MILLISECONDS_PER_DAY } from './date-utils.js';
import {
  normalize,
  parseDateKey,
  columnX,
  columnCenterX,
  getTimeAdjustment,
  getAdjustedTemp,
  calendarDayDifference,
} from "./core.js";

const LEGACY_CYCLE_PREFIX = 'cycle-';
const COVERLINE_TEMPERATURE_FIELDS = ['horizontalTemp', 'verticalTopTemp', 'verticalBottomTemp'];
const COVERLINE_ANCHOR_PREFIXES = ['vertical', 'horizontalStart', 'horizontalEnd'];
const COVERLINE_POSITIONS = ['start', 'center', 'end'];

function latestLegacyCoverlineKey(coverlines) {
  return Object.keys(coverlines || {})
    .filter(key => /^cycle-\d+$/.test(key))
    .sort((first, second) => Number(first.slice(LEGACY_CYCLE_PREFIX.length)) - Number(second.slice(LEGACY_CYCLE_PREFIX.length)))
    .at(-1);
}

/* ─── cycle detection ─────────────────────── */

/**
 * Returns a sorted array of cycle start dates.
 * A cycle start is the first menstruation day after a non-menstruation day.
 */
export function getCycleStartDates() {
  const keys   = Object.keys(store.entries).sort();
  const starts = [];

  keys.forEach((key, index) => {
    if (store.entries[key]?.bleeding !== "menstruation") return;
    const previousKey = keys[index - 1];
    const previousDate = previousKey ? parseDateKey(previousKey) : null;
    const isPreviousCalendarDay = previousDate
      ? calendarDayDifference(parseDateKey(key), previousDate) === 1
      : false;
    const previousDayIsPeriod = isPreviousCalendarDay
      && store.entries[previousKey]?.bleeding === "menstruation";
    if (!previousDayIsPeriod) starts.push(normalize(parseDateKey(key)));
  });

  return starts;
}

/**
 * Returns the cycle-day number for a given date relative to the most
 * recent cycle start that is ≤ that date. Falls back to entry index + 1
 * if no cycle start has been recorded yet.
 */
export function resolveCycleDay(date, starts, fallbackIndex) {
  const normalizedDate = normalize(date);
  const latestStart = starts.findLast(start => normalize(start) <= normalizedDate);
  return latestStart === undefined ? fallbackIndex + 1 : calendarDayDifference(normalizedDate, normalize(latestStart)) + 1;
}

/**
 * Returns a stable cycle ID string (e.g. "cycle-2") for a given date.
 * Increments each time a new cycle start is detected before that date.
 */
export function resolveCycleId(date, starts = getCycleStartDates()) {
  const normalizedDate = normalize(date);
  const cycleIndex = starts.findLastIndex(start => normalize(start) <= normalizedDate) + 1;
  return `cycle-${cycleIndex || 1}`;
}

function buildColumn(key, index, date, starts) {
  const raw = store.entries[key] ?? {};
  const mapProfile = store.getActiveMapProfile();

  return {
    key,
    date,
    index,

    x: columnX(index),
    centerX: columnCenterX(index),

    cycleId: resolveCycleId(date, starts),
    cycleDay: resolveCycleDay(date, starts, index),

    temp: raw.temp ?? null,
    tempFactors: raw.tempFactors ?? "",
    tempFactorsOther: raw.tempFactorsOther ?? "",
    measurementTime: raw.measurementTime ?? "",
    timeAdjustment: getTimeAdjustment(raw.measurementTime, mapProfile.usualMeasurementTime),
    adjustedTemp: getAdjustedTemp(raw.temp, raw.measurementTime, mapProfile.usualMeasurementTime),

    bleeding: raw.bleeding ?? "none",
    bleedingIntensity: raw.bleedingIntensity ?? "",
    sensation: raw.sensation ?? "",
    stretch: raw.stretch ?? false,
    visible: raw.visible ?? false,
    consistency: raw.consistency ?? "",
    color: raw.color ?? "",
    sediment: raw.sediment ?? false,
    cervixFirmness: raw.cervixFirmness ?? "",
    cervixHeight: raw.cervixHeight ?? "",
    cervixOpenness: raw.cervixOpenness ?? "",
    sex: raw.sex === true,
    other: raw.other ?? "",
    isFertile: isFertileDay(key, store.entries),
    isPeak: raw.isPeak ?? false,
    markers: normalizeDayMarkers(raw.markers, raw),
  };
}

/* ─── column building ─────────────────────── */

/**
 * Builds the column array from store.entries.
 * Each column is a flat object merging entry data with
 * computed layout positions and cycle metadata.
 * Consumed by all render functions each cycle.
 */
export function buildColumns() {
  const keys = Object.keys(store.entries).sort();
  if (!keys.length) return [];

  const starts = getCycleStartDates();

  const dates = [];
  const end = Date.parse(`${keys.at(-1)}T12:00:00Z`);
  for (let time = Date.parse(`${keys[0]}T12:00:00Z`); time <= end; time += MILLISECONDS_PER_DAY) {
    dates.push(new Date(time).toISOString().slice(0, ISO_DATE_KEY_LENGTH));
  }
  return dates.map((key, index) => {
    const date = parseDateKey(key);
    return buildColumn(key, index, date, starts);
  });
}

export function getFertileRange() {
  const { start, end } = store.fertileRange;
  return start && end ? { start, end } : null;
}

export function clearFertileRange() {
  store.fertileRange = { start: null, end: null };
}

export function isFertileDay(key, entries = store.entries) {
  if (entries[key]?.isFertile === true) return true;
  const range = getFertileRange();
  if (!range) return false;
  const day = normalize(parseDateKey(key));
  return day >= normalize(parseDateKey(range.start)) && day <= normalize(parseDateKey(range.end));
}

export function getCycleCoverlineValues(cycleIndex = null) {
  const key = cycleIndex == null ? "default" : `cycle-${cycleIndex}`;
  if (store.coverlines?.[key]) return store.coverlines[key];
  if (cycleIndex != null) return {};

  // Maps saved before cycle navigation was removed stored coverlines per cycle.
  const legacyKey = latestLegacyCoverlineKey(store.coverlines);
  return legacyKey ? store.coverlines[legacyKey] : {};
}

export function setCycleCoverlineValues(values, cycleIndex = null) {
  const key = cycleIndex == null ? "default" : `cycle-${cycleIndex}`;
  if (!store.coverlines[key]) store.coverlines[key] = {};
  const data = store.coverlines[key];

  COVERLINE_TEMPERATURE_FIELDS.forEach(field => {
    if (!(field in values)) return;
    if (values[field] != null) data[field] = values[field];
    else delete data[field];
  });

  COVERLINE_ANCHOR_PREFIXES.forEach(prefix => {
    const keyField = `${prefix}Key`;
    const positionField = `${prefix}Position`;
    if (keyField in values) {
      if (values[keyField] != null) data[keyField] = values[keyField];
      else {
        delete data[keyField];
        delete data[positionField];
      }
    }
    if (!(positionField in values)) return;
    if (data[keyField] && COVERLINE_POSITIONS.includes(values[positionField])) {
      data[positionField] = values[positionField];
    } else {
      delete data[positionField];
    }
  });
  if (!Object.keys(data).length) delete store.coverlines[key];
}

/** Removes both visible coverlines, including legacy cycle storage. */
export function clearCycleCoverlineValues(cycleIndex = null) {
  const key = cycleIndex == null ? "default" : `cycle-${cycleIndex}`;
  if (store.coverlines?.[key]) {
    delete store.coverlines[key];
    return true;
  }
  if (cycleIndex != null) return false;

  const legacyKey = latestLegacyCoverlineKey(store.coverlines);
  if (!legacyKey) return false;
  delete store.coverlines[legacyKey];
  return true;
}
