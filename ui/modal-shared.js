import { store } from "../store.js";
import { getElementById, querySelectorAll } from "../core.js";
import { showMessage } from "./toast.js";
import { clearFieldErrors } from './field-errors.js';
import { observationChoiceValue } from './observation-values.js';

let navigation = null;
export function configureModalNavigation(callbacks) {
  navigation = callbacks;
}

export function hideAllModals() {
  querySelectorAll('dialog:modal').forEach(dialog => dialog.close());
  querySelectorAll(".modal").forEach(modal => {
    modal.classList.remove("show");
    modal.classList.add("hidden");
  });
}

export function showModal(modalId) {
  const modal = getElementById(modalId);
  if (!modal) return;
  hideAllModals();
  clearFieldErrors(modal);
  modal.classList.remove("hidden");
  modal.classList.add("show");
  navigation?.modalOpened(modalId);
}

export function hideModal(modalId) {
  const modal = getElementById(modalId);
  if (!modal) return;
  const wasOpen = !modal.classList.contains("hidden");
  modal.classList.remove("show");
  modal.classList.add("hidden");
  if (wasOpen) navigation?.modalClosed(modalId);
}

export function afterModalSave(modalId, render, reopen) {
  render();
  if (!navigation && reopen) reopen();
}

export function syncModalUI() {
  querySelectorAll('input[data-observation]').forEach(input => { input.checked = store.modal[input.dataset.observation] === true; });
  querySelectorAll(".segmented button").forEach(button => {
    if (button.closest(".modal")?.classList.contains("hidden")) return;
    const value = observationChoiceValue(button.dataset.value);
    const active = store.modal[button.dataset.group] === value;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

export function toggleObservationChoice(group, value) {
  store.modal[group] = store.modal[group] === value ? undefined : value;
  if (group === 'bleedingIntensity') {
    store.modal.bleeding = store.modal.bleedingIntensity === 'spotting' ? 'spotting'
      : store.modal.bleedingIntensity ? 'menstruation' : undefined;
  }
  syncModalUI();
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
