import { store } from "../store.js";
import { PHONE_LAYOUT_QUERY, getElementById, parseDateKey, querySelectorAll } from "../core.js";
import { setDateText } from "../i18n.js";
import { activeCycleModel } from "../domain.js";
import { showMessage } from "./toast.js";
import { clearFieldErrors } from './field-errors.js';
import { observationChoiceValue } from './observation-values.js';
import { cervixPositionIcon } from './observation-scales.js';
import { focusModal, markModalClosed, markModalOpen, openingControl, rememberFocus, restoreFocus } from './modal-a11y.js';
import { growFromTrigger } from './modal-origin.js';

let navigation = null;
export function configureModalNavigation(callbacks) {
  navigation = callbacks;
}

const pageBehindModal = () => getElementById("trackerApp");
const anyModalShown = () => Array.from(querySelectorAll(".modal")).some(modal => modal.classList.contains("show"));

export function hideAllModals() {
  querySelectorAll('dialog:modal').forEach(dialog => dialog.close());
  querySelectorAll(".modal").forEach(modal => {
    modal.classList.remove("show");
    modal.classList.add("hidden");
  });
  markModalClosed(pageBehindModal());
}

export function showModal(modalId) {
  const modal = getElementById(modalId);
  if (!modal) return;
  rememberFocus();
  hideAllModals();
  clearFieldErrors(modal);
  modal.classList.remove("hidden");
  growFromTrigger(modal, openingControl(), {
    isPhone: () => window.matchMedia(PHONE_LAYOUT_QUERY).matches,
    reducedMotion: () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  });
  modal.classList.add("show");
  markModalOpen(modal, pageBehindModal());
  focusModal(modal);
  navigation?.modalOpened(modalId);
}

export function hideModal(modalId) {
  const modal = getElementById(modalId);
  if (!modal) return;
  const wasOpen = !modal.classList.contains("hidden");
  modal.classList.remove("show");
  modal.classList.add("hidden");
  if (wasOpen && !anyModalShown()) {
    markModalClosed(pageBehindModal());
    restoreFocus();
  }
  if (wasOpen) navigation?.modalClosed(modalId);
}

/**
 * Title for a day editor: the date in words for the current language and its cycle day.
 * Days after the last record still get the cycle day the calendar shows.
 */
export function setDayTitle(element, key, columns = []) {
  if (!element) return;
  if (!key) {
    element.textContent = "-";
    return;
  }
  const cycleDay = columns.find(column => column.key === key)?.cycleDay ?? activeCycleModel().cycleDay(key);
  setDateText(element, parseDateKey(key), "day", { cycleDay: cycleDay == null ? "" : String(cycleDay) });
}

/** Keeps the open dialog's URL in step with the selected day without adding history entries. */
export function refreshModalRoute(modalId) {
  navigation?.modalRouteChanged?.(modalId);
}

export function afterModalSave(modalId, render, reopen) {
  render();
  if (!navigation && reopen) reopen();
}

export function syncModalUI() {
  const otherDetails = getElementById("otherModalDetails");
  if (otherDetails) otherDetails.hidden = !store.modal.otherEnabled;
  querySelectorAll('input[data-observation]').forEach(input => { input.checked = store.modal[input.dataset.observation] === true; });
  querySelectorAll(".segmented button").forEach(button => {
    if (button.closest(".modal")?.classList.contains("hidden")) return;
    const value = observationChoiceValue(button.dataset.value);
    const group = button.dataset.group;
    const active = store.modal[group] === value;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
    if (group === 'cervixHeight') {
      const icon = button.querySelector('.observation-scale-icon');
      if (icon) icon.innerHTML = cervixPositionIcon(value, store.modal.cervixOpenness);
    }
  });
}

export function toggleObservationChoice(group, value) {
  store.modal[group] = store.modal[group] === value ? undefined : value;
  if (group === 'bleedingIntensity') {
    store.modal.bleeding = store.modal.bleedingIntensity === 'spotting' ? 'spotting'
      : store.modal.bleedingIntensity ? 'menstruation' : undefined;
  }
  syncModalUI();
  if (group === "otherEnabled" && store.modal.otherEnabled) getElementById("otherModalInput")?.focus();
}

export function resetModalState() {
  store.resetModal();
}

export function updateSelectedEntry(patch) {
  const entry = store.updateEntry(store.selectedKey, patch);
  // Missing observations are omitted, rather than saved as a negative answer.
  if (entry) Object.keys(patch).forEach(field => {
    if (patch[field] === undefined) delete entry[field];
  });
  return entry;
}

export function persistStore() {
  try {
    store.save();
    return true;
  } catch {
    showMessage("Changes could not be saved. Please try again.");
    return false;
  }
}
