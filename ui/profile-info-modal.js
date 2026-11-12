import { setText } from '../i18n.js';
import { store } from '../store.js';
import { PROFILE_GOALS, MEASUREMENT_METHODS } from '../profile-options.js';
import { openMapDialog } from './map-dialog.js';
import { enhanceTimeInputs } from './time-picker.js';
import { showMessage } from './toast.js';
import { readMapSettings, renderMapSettingsFields } from '../views/map-settings-fields.js';

let renderAfterSettingsChange = () => {};

/** Supplies the active-map render so edited settings (e.g. measurement time) update the chart. */
export function configureMapSettingsEditor({ render }) {
  renderAfterSettingsChange = render;
}

export function profileInfoRows(profile) {
  return [
    ['Name', profile.name],
    ['Consultant', profile.consultantName],
    ['Age', profile.age],
    ['Time', profile.usualMeasurementTime],
    ['Goal', PROFILE_GOALS[profile.goal]],
    ['Measurement method', MEASUREMENT_METHODS[profile.measurementMethod]],
  ];
}

/** Own maps can change their settings; imported maps keep the author's values. */
export function canEditActiveMapSettings() {
  const map = store.getActiveMap();
  return Boolean(map) && !map.profileSnapshotLocked;
}

export function openMapSettingsDialog() {
  const mapId = store.getActiveMapId();
  if (!canEditActiveMapSettings()) return null;
  const dialog = openMapDialog({
    title: 'Map settings', submitLabel: 'Save', closeOnNavigation: true,
    body: renderMapSettingsFields(store.getActiveMapProfile()),
    onSubmit: form => {
      try {
        if (!store.updateMapSettings(mapId, readMapSettings(form))) return;
      } catch {
        showMessage('Changes could not be saved. Please try again.');
        return;
      }
      form.close();
      renderAfterSettingsChange();
      showMessage('Saved ✓');
    },
  });
  enhanceTimeInputs(dialog);
  return dialog;
}

export function openProfileInfo(trigger) {
  const dialog = document.createElement('dialog');
  dialog.className = 'profile-details-dialog';
  dialog.setAttribute('aria-labelledby', 'profileDetailsTitle');
  dialog.innerHTML = '<h2 id="profileDetailsTitle" data-i18n>Profile</h2><dl></dl><button type="button" class="btn" data-close data-i18n>Close</button>';
  const list = dialog.querySelector('dl');
  profileInfoRows(store.getActiveMapProfile()).forEach(([label, value]) => {
    const term = document.createElement('dt');
    const detail = document.createElement('dd');
    setText(term, label);
    if (label === 'Goal' || label === 'Measurement method') setText(detail, value || '—');
    else detail.textContent = value || '—';
    list.append(term, detail);
  });
  if (store.getActiveMap()?.profileSnapshotLocked) {
    const note = document.createElement('p');
    note.className = 'field-hint';
    setText(note, "Shared map: these are the author's details and measurement settings.");
    list.after(note);
  }
  if (canEditActiveMapSettings()) {
    const edit = document.createElement('button');
    edit.type = 'button';
    edit.className = 'btn primary';
    setText(edit, 'Edit map settings');
    edit.onclick = () => {
      dialog.close();
      openMapSettingsDialog();
    };
    dialog.querySelector('[data-close]').before(edit);
  }
  dialog.querySelector('[data-close]').onclick = () => dialog.close();
  dialog.addEventListener('close', () => {
    dialog.remove();
    if (!document.querySelector('dialog[open]')) trigger?.focus({ preventScroll: true });
  });
  document.body.append(dialog);
  dialog.showModal();
}
