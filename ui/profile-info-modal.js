import { setText } from '../i18n.js';
import { store } from '../store.js';

export function profileInfoRows(profile) {
  return [
    ['Name', profile.name],
    ['Consultant', profile.consultantName],
    ['Age', profile.age],
    ['Time', profile.usualMeasurementTime],
    ['Goal', { avoid: 'Avoid pregnancy', achieve: 'Achieve pregnancy', observation: 'Observation only' }[profile.goal]],
    ['Method', { oral: 'Oral', vaginal: 'Vaginal', rectal: 'Rectal' }[profile.measurementMethod]],
  ];
}

export function openProfileInfo(trigger) {
  const dialog = document.createElement('dialog');
  dialog.className = 'profile-details-dialog';
  dialog.setAttribute('aria-labelledby', 'profileDetailsTitle');
  dialog.innerHTML = '<h2 id="profileDetailsTitle" data-i18n>Profile</h2><dl></dl><button type="button" class="btn" data-i18n>Close</button>';
  const list = dialog.querySelector('dl');
  for (const [label, value] of profileInfoRows(store.getActiveMapProfile())) {
    const term = document.createElement('dt');
    const detail = document.createElement('dd');
    setText(term, label);
    if (label === 'Goal' || label === 'Method') setText(detail, value || '—');
    else detail.textContent = value || '—';
    list.append(term, detail);
  }
  dialog.querySelector('button').onclick = () => dialog.close();
  dialog.addEventListener('close', () => {
    dialog.remove();
    trigger?.focus({ preventScroll: true });
  });
  document.body.append(dialog);
  dialog.showModal();
}
