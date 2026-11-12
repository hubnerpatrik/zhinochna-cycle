// Synthetic sample data for the local development mode (VITE_DEV_AUTH_BYPASS).
// Never used in production builds; it only fills an empty development browser storage.

import { formatDateKey } from "../date-utils.js";

export const DEMO_PROFILE = Object.freeze({
  name: "Demo profile",
  usualMeasurementTime: "07:00",
  measurementMethod: "oral",
  goal: "observation",
});

export const DEMO_MAP_NAME = "Demo map";

// One cycle: low phase, temperature shift after day 15, ending on the current day.
const DEMO_TEMPERATURES = [
  36.45, 36.4, 36.35, 36.4, 36.35, 36.3, 36.4, null, 36.35, 36.4,
  36.45, 36.35, 36.4, 36.3, 36.35, 36.6, 36.7, 36.75, 36.7, 36.8,
  36.75, 36.8,
];
export const DEMO_DAY_COUNT = DEMO_TEMPERATURES.length;

const BLEEDING_BY_DAY = { 1: "medium", 2: "heavy", 3: "medium", 4: "light", 5: "light" };
const FERTILE_DAYS = new Set([10, 11, 12, 13, 14, 15, 16]);

function observationsForDay(day) {
  const entry = {};
  const intensity = BLEEDING_BY_DAY[day];
  if (intensity) Object.assign(entry, { bleeding: "menstruation", bleedingIntensity: intensity, sediment: day === 2 });
  else if (day === 6) Object.assign(entry, { bleeding: "spotting", bleedingIntensity: "spotting" });
  else if (day <= 8) Object.assign(entry, { sensation: "dry" });
  else if (day <= 10) Object.assign(entry, { sensation: "moist", visible: true, consistency: "creamy", color: "white" });
  else if (day <= 14) Object.assign(entry, {
    sensation: "wet", stretch: true, visible: true, consistency: "stretchy", color: "translucent",
  });
  else Object.assign(entry, { sensation: "dry", consistency: "creamy", color: "white", visible: day <= 16 });

  if (day >= 11 && day <= 15) Object.assign(entry, { cervixFirmness: "soft", cervixHeight: "high", cervixOpenness: "open" });
  else if (day >= 7) Object.assign(entry, { cervixFirmness: "hard", cervixHeight: "low", cervixOpenness: "closed" });

  if (FERTILE_DAYS.has(day)) entry.isFertile = true;
  if (day === 9 || day === 18) entry.sex = true;
  if (day === 7) entry.tempFactors = "restlessSleep";
  if (day === 14) entry.markers = { mucus: { value: "P", pointType: "temp" } };
  if (day >= 16 && day <= 18) entry.markers = { bbt: { value: String(day - 15), pointType: "temp" } };
  if (day === 12) entry.other = "Sample note";
  return entry;
}

/** Builds date-keyed demo entries; the last entry falls on `today`. */
export function createDemoEntries(today = new Date()) {
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (DEMO_DAY_COUNT - 1));
  const entries = {};
  DEMO_TEMPERATURES.forEach((temp, index) => {
    const day = index + 1;
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index);
    const entry = observationsForDay(day);
    if (temp !== null) {
      entry.temp = temp;
      // One late measurement shows the time-adjusted temperature beside the original.
      entry.measurementTime = day === 13 ? "08:30" : "07:00";
    }
    entries[formatDateKey(date)] = entry;
  });
  return entries;
}

/** Adds the demo profile and map only when the development storage is still empty. */
export function seedDemoData(store, today = new Date()) {
  if (store.hasProfile() || store.listMaps().length > 0) return false;
  store.saveProfile(DEMO_PROFILE);
  store.createMap(DEMO_MAP_NAME);
  Object.entries(createDemoEntries(today)).forEach(([key, entry]) => store.updateEntry(key, entry));
  store.save();
  return true;
}
