export { normalize, calendarDayNumber, calendarDayDifference, parseDateKey, formatDateKey, getCalendarFocusDate, getDaysInMonth, getMonthOffset } from './date-utils.js';
import { applyLayoutClass } from './ui/layout-classes.js';

// Shared geometry, date utilities and the layout synchronization entry point.

export const getElementById = id => document.getElementById(id);
export const querySelectorAll = selector => document.querySelectorAll(selector);
// Retain the existing public aliases for integrations importing core utilities.
export { getElementById as qs, querySelectorAll as qsa };

export const DEFAULT_LAYOUT = Object.freeze({
  columnWidth: 50,
  sideLabelWidth: 96,
  tempScaleWidth: 72,
  chartHeight: 840,
  chartPaddingTop: 12,
  chartPaddingBottom: 8,
  minTemp: 36.0,
  maxTemp: 37.4,
  tempStep: 0.05,
});
export const LAYOUT = { ...DEFAULT_LAYOUT };

export const TEMPERATURE_RANGE = Object.freeze({
  min: LAYOUT.minTemp,
  max: LAYOUT.maxTemp,
});

// Stored measurements may exceed the fixed chart scale (for example during illness).
export const MEASUREMENT_TEMPERATURE_RANGE = Object.freeze({ min: TEMPERATURE_RANGE.min, max: 43 });
export const isChartTemperature = temp => temp >= LAYOUT.minTemp && temp <= LAYOUT.maxTemp;
export const chartPointY = temp => chartY(Math.max(LAYOUT.minTemp, Math.min(LAYOUT.maxTemp, temp)));

const MINUTES_PER_HOUR = 60;
const TEMPERATURE_PRECISION_FACTOR = 100;

export const TEMP_FACTORS = {
  alcohol: "Alcohol", travel: "Travel", stress: "Stress", medication: "Medication",
  illness: "Illness", restlessSleep: "Restless sleep", newThermometer: "New thermometer",
  physicalActivity: "Physical activity", other: "Other",
};

const TEMP_ADJUSTMENT_PER_HOUR = 0.1;

function timeToMinutes(time) {
  if (typeof time !== "string" || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)) return null;
  const [hours, minutes] = time.split(":").map(Number);
  return hours * MINUTES_PER_HOUR + minutes;
}

const roundTemperature = temperature => Math.round(temperature * TEMPERATURE_PRECISION_FACTOR) / TEMPERATURE_PRECISION_FACTOR;

export function getTimeAdjustment(actualTime, usualTime) {
  const actual = timeToMinutes(actualTime);
  const usual = timeToMinutes(usualTime);
  if (actual == null || usual == null) return 0;
  return roundTemperature(-((actual - usual) / MINUTES_PER_HOUR) * TEMP_ADJUSTMENT_PER_HOUR);
}

export function getAdjustedTemp(temp, actualTime, usualTime) {
  if (temp == null) return null;
  const adjustment = getTimeAdjustment(actualTime, usualTime);
  return adjustment === 0 ? null : roundTemperature(temp + adjustment);
}

export function formatTemp(temp) { return temp != null ? Number(temp).toFixed(2) : "-"; }
export function columnX(index) { return index * LAYOUT.columnWidth; }
export function columnCenterX(index) { return columnX(index) + LAYOUT.columnWidth / 2; }
export function chartWidth(columns) { return columns.length * LAYOUT.columnWidth; }
export function graphHeight() { return LAYOUT.chartHeight - LAYOUT.chartPaddingTop - LAYOUT.chartPaddingBottom; }
export function tempSlotCount() { return Math.round((LAYOUT.maxTemp - LAYOUT.minTemp) / LAYOUT.tempStep) + 1; }
export function tempSlotHeight() { return graphHeight() / tempSlotCount(); }
export function chartGridY(index) { return LAYOUT.chartPaddingTop + index * tempSlotHeight(); }

export function chartY(temp) {
  const slots = tempSlotCount();
  const index = Math.min(Math.max(Math.round((temp - LAYOUT.minTemp) / LAYOUT.tempStep), 0), slots - 1);
  return chartGridY(slots - 1 - index) + tempSlotHeight() / 2;
}

export function chartLineY(temp) {
  const slots = tempSlotCount();
  const index = Math.min(Math.max(Math.round((temp - LAYOUT.minTemp) / LAYOUT.tempStep), 0), slots);
  return chartGridY(slots - index);
}

export function pixelYToTemp(y) {
  const slots = tempSlotCount();
  const line = Math.min(Math.max(Math.round((y - LAYOUT.chartPaddingTop) / tempSlotHeight()), 0), slots);
  return LAYOUT.minTemp + (slots - line) * LAYOUT.tempStep;
}

/** Returns the temperature cell containing a canvas Y coordinate. */
export function pixelYToChartCellTemp(y) {
  const slots = tempSlotCount();
  const gridBottom = LAYOUT.chartHeight - LAYOUT.chartPaddingBottom;
  if (y < LAYOUT.chartPaddingTop || y >= gridBottom) return null;

  const row = Math.floor((y - LAYOUT.chartPaddingTop) / tempSlotHeight());
  const temp = LAYOUT.minTemp + (slots - 1 - row) * LAYOUT.tempStep;
  return roundTemperature(temp);
}

export function pixelXToColumnKey(x, columns) {
  if (!columns.length) return null;
  return columns.reduce((closest, column) =>
    Math.abs(x - column.centerX) < Math.abs(x - closest.centerX) ? column : closest).key;
}

export function syncCSSVariables() {
  applyLayoutClass(document.documentElement, 'chart-geometry', {
    '--column-width': LAYOUT.columnWidth,
    '--label-width': LAYOUT.sideLabelWidth,
    '--temp-scale-width': LAYOUT.tempScaleWidth,
    '--chart-height': LAYOUT.chartHeight,
  });
}
