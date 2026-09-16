import { setText, setDateText, setTranslatedAttribute } from '../i18n.js';
import { store } from "../store.js";
import { calendarDayDifference, formatDateKey, getDaysInMonth, getMonthOffset, parseDateKey, qs } from "../core.js";
import { clearFertileRange, getFertileRange, getCycleStartDates } from "../domain.js";
import { hideModal, persistStore, showModal } from "./modal-shared.js";
import { showMessage } from "./toast.js";

let draft = null;

function collectFertileDays() {
  const selected = new Set(Object.keys(store.entries).filter(key => store.entries[key]?.isFertile === true));
  const legacyRange = getFertileRange();
  if (!legacyRange) return selected;
  const cursor = parseDateKey(legacyRange.start);
  const end = parseDateKey(legacyRange.end);
  while (cursor <= end) {
    selected.add(formatDateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return selected;
}

function toggleDay(key) {
  if (draft.selectedKeys.has(key)) draft.selectedKeys.delete(key);
  else draft.selectedKeys.add(key);
  renderPicker();
  qs("fertileRangeCalendar").querySelector(`[data-date="${key}"]`)?.focus({ preventScroll: true });
}

function renderPicker() {
  setDateText(qs("fertileRangeMonthLabel"), new Date(draft.year, draft.month));
  const calendar = qs("fertileRangeCalendar");
  calendar.replaceChildren();
  ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].forEach(day => {
    const weekday = document.createElement("div");
    weekday.className = "calendar-weekday";
    setText(weekday, day);
    calendar.appendChild(weekday);
  });
  const offset = getMonthOffset(draft.year, draft.month);
  const starts = getCycleStartDates().reverse();
  for (let index = 0; index < offset; index++) calendar.appendChild(document.createElement("div"));
  for (let day = 1; day <= getDaysInMonth(draft.year, draft.month); day++) {
    const key = formatDateKey(new Date(draft.year, draft.month, day));
    const cell = document.createElement("button");
    cell.type = "button";
    cell.setAttribute("data-date", key);
    cell.className = "day";
    const start = starts.find(start => start <= parseDateKey(key));
    if (start) {
      const cycleNumber = document.createElement("span");
      cycleNumber.className = "day-cycle-num";
      cycleNumber.textContent = calendarDayDifference(parseDateKey(key), start) + 1;
      cell.appendChild(cycleNumber);
    }
    const dayNumber = document.createElement("span");
    dayNumber.textContent = day;
    cell.appendChild(dayNumber);
    cell.setAttribute("aria-pressed", String(draft.selectedKeys.has(key)));
    setTranslatedAttribute(cell, "aria-label", start ? `${key} (CD ${calendarDayDifference(parseDateKey(key), start) + 1})` : key);
    cell.classList.toggle("fertile-day", draft.selectedKeys.has(key));
    cell.onclick = () => toggleDay(key);
    calendar.appendChild(cell);
  }
}

export function changeFertileRangeMonth(delta) {
  if (!draft) return;
  draft.month += delta;
  if (draft.month < 0) {
    draft.month = 11;
    draft.year--;
  } else if (draft.month > 11) {
    draft.month = 0;
    draft.year++;
  }
  renderPicker();
}

export function openFertileRangeModal() {
  const selectedKeys = collectFertileDays();
  const firstSelected = [...selectedKeys].sort()[0];
  const focusKey = firstSelected || store.selectedKey || Object.keys(store.entries).sort().at(-1);
  const focus = focusKey ? parseDateKey(focusKey) : new Date();
  draft = { month: focus.getMonth(), year: focus.getFullYear(), selectedKeys };
  renderPicker();
  showModal("fertileRangeModal");
}

export function closeFertileRangeModal() {
  hideModal("fertileRangeModal");
}

export function saveFertileRangeModal(render) {
  if (!draft) return;
  Object.keys(store.entries).forEach(key => {
    if (store.entries[key]?.isFertile === true) delete store.entries[key].isFertile;
  });
  draft.selectedKeys.forEach(key => store.updateEntry(key, { isFertile: true }));
  clearFertileRange();
  if (!persistStore()) {
    render();
    return;
  }
  showMessage("Saved ✓");
  closeFertileRangeModal();
  draft = null;
  render();
}

export function clearFertileRangeModal() {
  if (!draft) return;
  const monthPrefix = `${draft.year}-${String(draft.month + 1).padStart(2, "0")}-`;
  const matches = [...draft.selectedKeys].filter(key => key.startsWith(monthPrefix));
  matches.forEach(key => draft.selectedKeys.delete(key));
  if (!matches.length) return showMessage("No fertile days in this month");
  renderPicker();
  showMessage(`Cleared ${matches.length} day${matches.length === 1 ? "" : "s"} in this month`);
}
