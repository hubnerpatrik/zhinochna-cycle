// domain.js — Column building and active-map coverlines
// ─────────────────────────────────────────────
// Builds the column array consumed by render from the active map,
// using the cycle model for cycle and fertility answers.

import { normalizeDayMarkers, store } from "./store.js";
import { ISO_DATE_KEY_LENGTH, MILLISECONDS_PER_DAY } from './date-utils.js';
import {
  parseDateKey,
  columnX,
  columnCenterX,
  getTimeAdjustment,
  getAdjustedTemp,
} from "./core.js";
import { cycleModel } from './cycle-model.js';

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

/* ─── cycle model ─────────────────────────── */

/** The cycle model of the active map. */
export function activeCycleModel() {
  return cycleModel({ entries: store.entries, fertileRange: store.fertileRange });
}

function buildColumn(key, index, model, mapProfile) {
  const raw = store.entries[key] ?? {};

  return {
    key,
    date: parseDateKey(key),
    index,

    x: columnX(index),
    centerX: columnCenterX(index),

    cycleId: model.cycleId(key),
    // Before the first recorded cycle start the chart numbers days from the map's first day.
    cycleDay: model.cycleDay(key) ?? index + 1,

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
    isFertile: model.isFertile(key),
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

  const model = activeCycleModel();
  const mapProfile = store.getActiveMapProfile();

  const dates = [];
  const end = Date.parse(`${keys.at(-1)}T12:00:00Z`);
  for (let time = Date.parse(`${keys[0]}T12:00:00Z`); time <= end; time += MILLISECONDS_PER_DAY) {
    dates.push(new Date(time).toISOString().slice(0, ISO_DATE_KEY_LENGTH));
  }
  return dates.map((key, index) => buildColumn(key, index, model, mapProfile));
}

export function getFertileRange() {
  const { start, end } = store.fertileRange;
  return start && end ? { start, end } : null;
}

export function clearFertileRange() {
  store.fertileRange = { start: null, end: null };
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
