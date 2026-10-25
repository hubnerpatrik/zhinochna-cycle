import { setText, setDateText, setTranslatedAttribute } from '../i18n.js';
import { applyLayoutClass } from './layout-classes.js';
import { appendCalendarHeader } from './calendar-shared.js';
import { store } from "../store.js";
import {
  LAYOUT,
  MEASUREMENT_TEMPERATURE_RANGE,
  TEMP_FACTORS,
  calendarDayDifference,
  chartY,
  formatDateKey,
  getDaysInMonth,
  getElementById,
} from "../core.js";
import { getCycleStartDates, isFertileDay } from "../domain.js";

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
  element.innerHTML = "";

  appendCalendarHeader(element, store.year, store.month);

  const totalDays = getDaysInMonth(store.year, store.month);
  const descendingCycleStarts = getCycleStartDates().reverse();

  Array.from({ length: totalDays }, (_, index) => index + 1).forEach(day => {
    const date = new Date(store.year, store.month, day);
    const key = formatDateKey(date);
    const entry = store.entries[key];
    const cell = document.createElement("div");
    cell.className = "day";
    setTranslatedAttribute(cell, 'title', `${key} · Select this day to review or edit its observations.`);

    const latestCycleStart = descendingCycleStarts.find(start => start <= date);
    if (latestCycleStart) {
      const cycleNumber = document.createElement("span");
      cycleNumber.className = "day-cycle-num";
      cycleNumber.textContent = calendarDayDifference(date, latestCycleStart) + 1;
      cell.appendChild(cycleNumber);
    }

    const dayNumber = document.createElement("span");
    dayNumber.textContent = day;
    cell.appendChild(dayNumber);

    if (entry?.bleeding === "menstruation") cell.classList.add("red");
    if (entry?.bleeding === "spotting") cell.classList.add("spotting-day");
    if (isFertileDay(key)) cell.classList.add("fertile-day");
    if (store.selectedKey === key) cell.classList.add("selected");

    cell.onclick = () => selectColumn(key);
    element.appendChild(cell);
  });
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
