import { escapeHtml } from "./view-utils.js";
import { PROFILE_GOALS, MEASUREMENT_METHODS, pickMapSettings } from "../profile-options.js";

const GOAL_OPTIONS = [['', 'Not set'], ...Object.entries(PROFILE_GOALS)];
const METHOD_OPTIONS = [['', 'Not set'], ...Object.entries(MEASUREMENT_METHODS)];

function renderOptions(options, selectedValue) {
  return options
    .map(([value, label]) => {
      const selected = value === selectedValue ? " selected" : "";
      return `<option value="${escapeHtml(value)}"${selected} data-i18n>${escapeHtml(label)}</option>`;
    })
    .join("");
}

/** Age, usual measurement time, goal and method: the settings stored with each map. */
export function renderMapSettingsFields(values = {}) {
  const settings = pickMapSettings(values);
  return `
    <div class="map-settings-fields">
      <label class="modal-section">
        <span class="input-label" data-i18n>Usual measurement time</span>
        <input name="usualMeasurementTime" type="time" value="${escapeHtml(settings.usualMeasurementTime)}">
      </label>
      <label class="modal-section">
        <span class="input-label" data-i18n>Measurement method</span>
        <select name="measurementMethod">${renderOptions(METHOD_OPTIONS, settings.measurementMethod)}</select>
      </label>
      <label class="modal-section">
        <span class="input-label" data-i18n>Goal</span>
        <select name="goal">${renderOptions(GOAL_OPTIONS, settings.goal)}</select>
      </label>
      <label class="modal-section">
        <span class="input-label" data-i18n>Age</span>
        <input name="age" type="number" min="10" max="60" placeholder="e.g. 30" data-i18n-placeholder="e.g. 30" value="${escapeHtml(settings.age)}">
      </label>
    </div>
  `;
}

export function readMapSettings(root) {
  const value = name => root.querySelector(`[name='${name}']`)?.value ?? "";
  return pickMapSettings({
    age: value("age"),
    usualMeasurementTime: value("usualMeasurementTime"),
    goal: value("goal"),
    measurementMethod: value("measurementMethod"),
  });
}
