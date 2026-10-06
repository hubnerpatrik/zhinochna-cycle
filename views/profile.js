import { enhanceTimeInputs } from "../ui/time-picker.js";
import { prepareProfilePhoto, isStoredProfilePhoto } from '../profile-photo.js';
import { setText } from '../i18n.js';

const GOAL_OPTIONS = [
  ["", "Not set"],
  ["avoid", "Avoid pregnancy"],
  ["achieve", "Achieve pregnancy"],
  ["observation", "Observation only"],
];

const METHOD_OPTIONS = [
  ["", "Not set"],
  ["oral", "Oral"],
  ["vaginal", "Vaginal"],
  ["rectal", "Rectal"],
];

function renderOptions(options, selectedValue) {
  return options
    .map(([value, label]) => {
      const selected = value === selectedValue ? " selected" : "";
      return `<option value="${escapeHtml(value)}"${selected} data-i18n>${escapeHtml(label)}</option>`;
    })
    .join("");
}

function readProfile(container) {
  return {
    name: container.querySelector("[name='name']")?.value ?? "",
    consultantName: container.querySelector("[name='consultantName']")?.value ?? "",
    age: container.querySelector("[name='age']")?.value ?? "",
    usualMeasurementTime: container.querySelector("[name='usualMeasurementTime']")?.value ?? "",
    goal: container.querySelector("[name='goal']")?.value ?? "",
    measurementMethod: container.querySelector("[name='measurementMethod']")?.value ?? "",
  };
}

export function renderProfileScreen(container, {
  title,
  subtitle,
  profile,
  submitLabel,
  showCancel,
  onSave,
  onCancel,
}) {
  let photo = isStoredProfilePhoto(profile.photo) ? profile.photo : '';
  let photoGeneration = 0;
  let processingPhoto = false;
  container.innerHTML = `
    <section class="screen screen-form" aria-label="${escapeHtml(title)}" data-i18n-aria-label="${escapeHtml(title)}">
      <div class="screen-shell">
        <div class="screen-hero">
          <p class="screen-kicker" data-i18n>Profile</p>
          <h2> <span data-i18n>${escapeHtml(title)}</span></h2>
          <p> <span data-i18n>${escapeHtml(subtitle)}</span></p>
        </div>

        <form class="screen-card screen-form-card profile-editor-card" id="profileScreenForm">
          <div class="profile-editor-layout">
            <div class="profile-fields">
              <div class="modal-section">
                <div class="input-label" data-i18n>Name</div>
                <input name="name" type="text" placeholder="Name" data-i18n-placeholder="Name" value="${escapeHtml(profile.name)}">
              </div>

              <div class="modal-section">
                <div class="input-label" data-i18n>Consultant name</div>
                <input name="consultantName" type="text" placeholder="Consultant name" data-i18n-placeholder="Consultant name" value="${escapeHtml(profile.consultantName)}">
              </div>

              <div class="modal-section">
                <div class="input-label" data-i18n>Age</div>
                <input name="age" type="number" min="10" max="60" placeholder="e.g. 30" data-i18n-placeholder="e.g. 30" value="${escapeHtml(profile.age)}">
              </div>

              <div class="modal-section">
                <div class="input-label" data-i18n>Usual measurement time</div>
                <input name="usualMeasurementTime" type="time" value="${escapeHtml(profile.usualMeasurementTime)}">
              </div>

              <div class="modal-section">
                <div class="input-label" data-i18n>Goal</div>
                <select name="goal">${renderOptions(GOAL_OPTIONS, profile.goal)}</select>
              </div>

              <div class="modal-section">
                <div class="input-label" data-i18n>Measurement method</div>
                <select name="measurementMethod">${renderOptions(METHOD_OPTIONS, profile.measurementMethod)}</select>
              </div>

              <div class="modal-actions screen-actions">
                ${showCancel ? '<button type="button" class="btn secondary" id="profileScreenCancelBtn" data-i18n>Back</button>' : ""}
                <button type="submit" class="btn primary"> <span data-i18n>${escapeHtml(submitLabel)}</span></button>
              </div>
            </div>

            <aside class="profile-photo-panel" aria-label="Profile photo" data-i18n-aria-label="Profile photo">
              <div class="profile-photo-placeholder">
                <img class="profile-photo-image" alt="Profile photo" data-i18n-alt="Profile photo" ${photo ? `src="${escapeHtml(photo)}"` : 'hidden'}>
                <svg viewBox="0 0 96 96" aria-hidden="true">
                  <circle cx="48" cy="35" r="17"></circle>
                  <path d="M18 84c2-19 14-30 30-30s28 11 30 30"></path>
                </svg>
              </div>
              <div class="profile-photo-title" data-i18n>Profile photo</div>
              <p data-i18n>JPG, PNG or WebP · up to 10 MB. Saved as a small square JPG.</p>
              <button type="button" class="btn primary profile-photo-upload" id="profilePhotoChoose" data-i18n>Choose photo</button>
              <input id="profilePhotoFile" type="file" accept="image/jpeg,image/png,image/webp" hidden>
              <button type="button" class="btn secondary" id="profilePhotoRemove" data-i18n>Remove photo</button>
              <p id="profilePhotoStatus" role="status" aria-live="polite"></p>
            </aside>
          </div>
        </form>

      </div>
    </section>
  `;

  const form = container.querySelector("#profileScreenForm");
  if (!form) return;
  const photoImage = container.querySelector('.profile-photo-image');
  const placeholder = container.querySelector('.profile-photo-placeholder svg');
  const removePhoto = container.querySelector('#profilePhotoRemove');
  const fileInput = container.querySelector('#profilePhotoFile');
  const photoStatus = container.querySelector('#profilePhotoStatus');
  const submit = form.querySelector('[type="submit"]');
  container.querySelector('#profilePhotoChoose').onclick = () => fileInput.click();
  const updatePhoto = () => {
    photoImage.hidden = !photo;
    if (photo) photoImage.src = photo;
    else photoImage.removeAttribute('src');
    placeholder.style.display = photo ? 'none' : '';
    removePhoto.disabled = !photo && !processingPhoto;
    submit.disabled = processingPhoto;
  };
  updatePhoto();
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files[0];
    if (!file) return;
    const generation = ++photoGeneration;
    processingPhoto = true;
    setText(photoStatus, 'Preparing photo…');
    updatePhoto();
    try {
      const prepared = await prepareProfilePhoto(file);
      if (generation !== photoGeneration || container.querySelector('#profileScreenForm') !== form) return;
      photo = prepared;
      setText(photoStatus, 'Photo ready. Save your profile to keep it.');
    } catch (error) {
      if (generation !== photoGeneration || container.querySelector('#profileScreenForm') !== form) return;
      setText(photoStatus, error.message);
    } finally {
      if (generation === photoGeneration && container.querySelector('#profileScreenForm') === form) {
        processingPhoto = false;
        fileInput.value = '';
        updatePhoto();
      }
    }
  });
  removePhoto.addEventListener('click', () => {
    ++photoGeneration;
    processingPhoto = false;
    photo = '';
    fileInput.value = '';
    setText(photoStatus, 'Photo removed. Save your profile to keep the change.');
    updatePhoto();
  });
  enhanceTimeInputs(container);
  form?.addEventListener("submit", event => {
    event.preventDefault();
    if (!processingPhoto) onSave?.({ ...readProfile(container), photo });
  });

  container.querySelector("#profileScreenCancelBtn")?.addEventListener("click", () => onCancel?.());
}
import { escapeHtml } from "./view-utils.js";
