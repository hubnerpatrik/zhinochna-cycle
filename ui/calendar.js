import { setText, setDateText, setTranslatedAttribute } from '../i18n.js';
import { applyLayoutClass } from './layout-classes.js';
import { appendCalendarHeader } from './calendar-shared.js';
import { store } from "../store.js";
import {
  LAYOUT,
  MEASUREMENT_TEMPERATURE_RANGE,
  TEMP_FACTORS,
  chartY,
  formatDateKey,
  getDaysInMonth,
  getElementById,
} from "../core.js";
import { activeCycleModel } from "../domain.js";

const COMPACT_SCALE_HEIGHT = 600;
const COMPACT_LABEL_INTERVAL = 4;
const TEMPERATURE_DECIMAL_PLACES = 2;

function temperatureScaleValues() {
  const temperatures = [];
  // Preserve repeated subtraction (and its rounding) from the original scale.
  for (let temperature = LAYOUT.maxTemp; temperature >= LAYOUT.minTemp - LAYOUT.tempStep / 2; temperature -= LAYOUT.tempStep) {
    temperatures.push(temperature);
  }
  return temperatures;
}

// Small calendar dots for observations that are otherwise only visible in the map rows.
export const CALENDAR_DAY_MARKS = Object.freeze([
  ["factor", "Influence factors", entry => Boolean(entry?.tempFactors)],
  ["sex", "Sex", entry => entry?.sex === true],
  ["other", "Additional symptoms", entry => Boolean(entry?.other?.trim?.())],
]);

export function calendarDayMarks(entry) {
  return CALENDAR_DAY_MARKS.filter(([, , recorded]) => recorded(entry)).map(([type]) => type);
}

function appendDayMarks(cell, entry) {
  const marks = calendarDayMarks(entry);
  if (!marks.length) return;
  const dots = document.createElement("span");
  dots.className = "day-marks";
  dots.setAttribute("aria-hidden", "true");
  marks.forEach(type => {
    const dot = document.createElement("span");
    dot.className = `day-mark day-mark-${type}`;
    dots.appendChild(dot);
  });
  cell.appendChild(dots);
}

/** Source text of a day's spoken label; i18n turns "@date" into the date in words. Colour and dots are never the only signal. */
export function calendarDayLabelSource(key, entry, cycleDay, fertile) {
  const parts = [`@${key}`];
  if (cycleDay != null) parts.push(`Cycle day ${cycleDay}`);
  if (entry?.bleeding === "menstruation") parts.push("Menstruation");
  if (entry?.bleeding === "spotting") parts.push("Spotting");
  if (fertile) parts.push("Fertile");
  CALENDAR_DAY_MARKS.forEach(([, label, recorded]) => { if (recorded(entry)) parts.push(label); });
  return parts.join(" · ");
}

const WEEK = 7;
/** Day of month a calendar arrow or Home/End key moves to, or null for other keys. */
export function calendarArrowTarget(day, totalDays, key) {
  const moves = { ArrowLeft: day - 1, ArrowRight: day + 1, ArrowUp: day - WEEK, ArrowDown: day + WEEK, Home: 1, End: totalDays };
  if (!(key in moves)) return null;
  return Math.min(totalDays, Math.max(1, moves[key]));
}

export function renderMonth() {
  setDateText(getElementById("monthLabel"), new Date(store.year, store.month));
}

export function renderTempScale() {
  const scale = getElementById("tempScale");
  if (!scale) return;
  scale.innerHTML = "";
  temperatureScaleValues().forEach((temperature, index) => {
    if (LAYOUT.chartHeight < COMPACT_SCALE_HEIGHT && index % COMPACT_LABEL_INTERVAL !== 0) return;
    const label = document.createElement("div");
    label.className = "temp-scale-label";
    label.textContent = Number(temperature).toFixed(TEMPERATURE_DECIMAL_PLACES);
    applyLayoutClass(label, `temperature-label-${index}`, { '--temperature-label-top': chartY(temperature) });
    scale.appendChild(label);
  });
}

export function renderCalendar(selectColumn) {
  const element = getElementById("calendar");
  const hadFocus = element.contains(document.activeElement);
  element.innerHTML = "";

  appendCalendarHeader(element, store.year, store.month);

  const totalDays = getDaysInMonth(store.year, store.month);
  const model = activeCycleModel();
  const monthPrefix = formatDateKey(new Date(store.year, store.month, 1)).slice(0, 7);
  const selectedInMonth = Boolean(store.selectedKey?.startsWith(monthPrefix));
  const todayKey = formatDateKey(new Date());

  Array.from({ length: totalDays }, (_, index) => index + 1).forEach(day => {
    const date = new Date(store.year, store.month, day);
    const key = formatDateKey(date);
    const entry = store.entries[key];
    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = "day";
    cell.dataset.day = String(day);
    // One tab stop for the whole month: the selected day, or the first day when the selection is elsewhere.
    cell.tabIndex = store.selectedKey === key || (day === 1 && !selectedInMonth) ? 0 : -1;
    const cycleDay = model.cycleDay(key);
    setTranslatedAttribute(cell, 'aria-label', calendarDayLabelSource(key, entry, cycleDay, model.isFertile(key)));
    if (store.selectedKey === key) cell.setAttribute("aria-pressed", "true");
    if (key === todayKey) cell.setAttribute("aria-current", "date");
    if (cycleDay != null) {
      const cycleNumber = document.createElement("span");
      cycleNumber.className = "day-cycle-num";
      cycleNumber.textContent = cycleDay;
      cell.appendChild(cycleNumber);
    }

    const dayNumber = document.createElement("span");
    dayNumber.textContent = day;
    cell.appendChild(dayNumber);
    appendDayMarks(cell, entry);

    if (entry?.bleeding === "menstruation") cell.classList.add("red");
    if (entry?.bleeding === "spotting") cell.classList.add("spotting-day");
    if (model.isFertile(key)) cell.classList.add("fertile-day");
    if (store.selectedKey === key) cell.classList.add("selected");

    cell.onclick = () => selectColumn(key);
    element.appendChild(cell);
  });

  element.onkeydown = event => {
    const current = event.target.closest?.(".day");
    if (!current) return;
    const target = calendarArrowTarget(Number(current.dataset.day), totalDays, event.key);
    if (target == null) return;
    event.preventDefault();
    element.querySelector(`.day[data-day="${target}"]`)?.focus();
  };
  // Selecting a day re-renders the month; keep keyboard users where they were.
  if (hadFocus) element.querySelector('.day[tabindex="0"]')?.focus();
}

export function renderTempFactorsOptions() {
  const select = getElementById("tempFactorsInput");
  if (!select) return;
  const tempInput = getElementById("tempInput");
  if (tempInput) {
    tempInput.min = String(MEASUREMENT_TEMPERATURE_RANGE.min);
    tempInput.max = String(MEASUREMENT_TEMPERATURE_RANGE.max);
  }

  select.innerHTML = `<option value="" data-i18n>None</option>`
    + Object.entries(TEMP_FACTORS)
      .map(([value, label]) => `<option value="${value}" data-i18n>${label}</option>`)
      .join("");
}
