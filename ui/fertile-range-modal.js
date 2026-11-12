import { setText, setDateText, setTranslatedAttribute } from '../i18n.js';
import { store } from "../store.js";
import { calendarDayDifference, formatDateKey, getDaysInMonth, parseDateKey, getElementById } from "../core.js";
import { LAST_MONTH_INDEX } from '../date-utils.js';
import { appendCalendarHeader } from './calendar-shared.js';
import { clearFertileRange, getFertileRange, getCycleStartDates } from "../domain.js";
import { hideModal, persistStore, showModal } from "./modal-shared.js";
import { showMessage } from "./toast.js";
import { isBlankEntry } from "../data-validation.js";

let draft = null;
let drag = null;
let suppressNextClick = false;

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
  getElementById("fertileRangeCalendar").querySelector(`[data-date="${key}"]`)?.focus({ preventScroll: true });
}

// Updates one day in place so a drag does not rebuild the calendar under the finger.
function setDraftDay(key, selected) {
  if (selected) draft.selectedKeys.add(key);
  else draft.selectedKeys.delete(key);
  const cell = getElementById("fertileRangeCalendar")?.querySelector(`[data-date="${key}"]`);
  cell?.classList.toggle("fertile-day", selected);
  cell?.setAttribute("aria-pressed", String(selected));
}

/** Date keys from `from` to `to` inclusive, in either direction. */
export function daysBetween(from, to) {
  const step = from <= to ? 1 : -1;
  const cursor = parseDateKey(from);
  const keys = [from];
  while (keys.at(-1) !== to) {
    cursor.setDate(cursor.getDate() + step);
    keys.push(formatDateKey(cursor));
  }
  return keys;
}

function dayKeyAt(clientX, clientY) {
  return document.elementFromPoint(clientX, clientY)?.closest?.("#fertileRangeCalendar [data-date]")?.dataset.date;
}

/**
 * Drag across days to mark several at once. The first day decides whether the
 * drag marks or unmarks; taps and keyboard activation still toggle a single day.
 */
export function bindFertileRangeDrag() {
  const calendar = getElementById("fertileRangeCalendar");
  if (!calendar || calendar.dataset.dragBound) return;
  calendar.dataset.dragBound = "true";
  calendar.addEventListener("pointerdown", event => {
    if (!draft || (event.pointerType === "mouse" && event.button !== 0)) return;
    const key = event.target.closest?.("[data-date]")?.dataset.date;
    if (!key) return;
    event.preventDefault();
    drag = { pointerId: event.pointerId, select: !draft.selectedKeys.has(key), lastKey: key };
    setDraftDay(key, drag.select);
    calendar.setPointerCapture?.(event.pointerId);
  });
  calendar.addEventListener("pointermove", event => {
    if (drag?.pointerId !== event.pointerId) return;
    const key = dayKeyAt(event.clientX, event.clientY);
    if (!key || key === drag.lastKey) return;
    // Fill every day between the previous and current position, so a fast swipe or a
    // drag across rows marks a continuous range in calendar order.
    daysBetween(drag.lastKey, key).forEach(day => setDraftDay(day, drag.select));
    drag.lastKey = key;
  });
  const finish = event => {
    if (drag?.pointerId !== event.pointerId) return;
    calendar.releasePointerCapture?.(event.pointerId);
    drag = null;
    // The pointer already applied the change; ignore the click that follows it.
    suppressNextClick = true;
    setTimeout(() => { suppressNextClick = false; }, 0);
  };
  calendar.addEventListener("pointerup", finish);
  calendar.addEventListener("pointercancel", finish);
}

function renderPicker() {
  setDateText(getElementById("fertileRangeMonthLabel"), new Date(draft.year, draft.month));
  const calendar = getElementById("fertileRangeCalendar");
  calendar.replaceChildren();
  appendCalendarHeader(calendar, draft.year, draft.month);
  const starts = getCycleStartDates().reverse();
  for (let day = 1; day <= getDaysInMonth(draft.year, draft.month); day++) {
    const key = formatDateKey(new Date(draft.year, draft.month, day));
    const cell = document.createElement("button");
    cell.type = "button";
    cell.setAttribute("data-date", key);
    cell.className = "day";
    setTranslatedAttribute(cell, 'title', `${key} · Manually mark or unmark individual fertile days.`);
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
    cell.onclick = () => {
      if (suppressNextClick) {
        suppressNextClick = false;
        return;
      }
      toggleDay(key);
    };
    calendar.appendChild(cell);
  }
}

export function changeFertileRangeMonth(delta) {
  if (!draft) return;
  draft.month += delta;
  if (draft.month < 0) {
    draft.month = LAST_MONTH_INDEX;
    draft.year--;
  } else if (draft.month > LAST_MONTH_INDEX) {
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
  // An unmarked day that held nothing else must not keep stretching the map and chart.
  Object.keys(store.entries).forEach(key => {
    if (isBlankEntry(store.entries[key])) delete store.entries[key];
  });
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
