import { setText } from '../i18n.js';
import { store } from '../store.js';
import { PROFILE_GOALS, MEASUREMENT_METHODS } from '../profile-options.js';

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

export function openProfileInfo(trigger) {
  const dialog = document.createElement('dialog');
  dialog.className = 'profile-details-dialog';
  dialog.setAttribute('aria-labelledby', 'profileDetailsTitle');
  dialog.innerHTML = '<h2 id="profileDetailsTitle" data-i18n>Profile</h2><dl></dl><button type="button" class="btn" data-i18n>Close</button>';
  const list = dialog.querySelector('dl');
  profileInfoRows(store.getActiveMapProfile()).forEach(([label, value]) => {
    const term = document.createElement('dt');
    const detail = document.createElement('dd');
    setText(term, label);
    if (label === 'Goal' || label === 'Measurement method') setText(detail, value || '—');
    else detail.textContent = value || '—';
    list.append(term, detail);
  });
  dialog.querySelector('button').onclick = () => dialog.close();
  dialog.addEventListener('close', () => {
    dialog.remove();
    trigger?.focus({ preventScroll: true });
  });
  document.body.append(dialog);
  dialog.showModal();
}
