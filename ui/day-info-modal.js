import { store } from "../store.js";
import { setText } from "../i18n.js";
import { TEMP_FACTORS, formatTemp, getAdjustedTemp, getElementById } from "../core.js";
import { hideModal, showModal } from "./modal-shared.js";
import { showMessage } from "./toast.js";
import { BLEEDING_LABELS } from './bleeding-icons.js';
import { OBSERVATION_LABELS } from './observation-labels.js';

const LABELS = {
  bleeding: { none: "None", spotting: "Spotting", menstruation: "Period" },
  sensation: OBSERVATION_LABELS.sensation,
  consistency: OBSERVATION_LABELS.consistency,
  color: OBSERVATION_LABELS.color,
  firmness: { "": "-", ...OBSERVATION_LABELS.cervixFirmness },
  height: { "": "-", ...OBSERVATION_LABELS.cervixHeight },
  openness: { "": "-", ...OBSERVATION_LABELS.cervixOpenness },
};

export function renderInfoLines(element, lines) {
  element.replaceChildren();
  lines.forEach((line, index) => {
    if (index) element.appendChild(document.createElement("br"));
    const span = document.createElement("span");
    setText(span, line);
    element.appendChild(span);
  });
}

export function renderDayInfo(currentColumns) {
  if (!store.selectedKey) return showMessage("Select a day first");
  const key = store.selectedKey;
  const data = store.entries[key] || {};
  const observationLabel = (field, labels) => Object.hasOwn(data, field) ? (labels[data[field]] ?? '-') : '-';
  const column = currentColumns.find(item => item.key === key);
  setText(getElementById("dayInfoTitle"), `${key} (CD ${column?.cycleDay ?? "-"})`);

  const adjusted = getAdjustedTemp(
    data.temp,
    data.measurementTime,
    store.getActiveMapProfile().usualMeasurementTime,
  );
  setText(getElementById("infoTemp"), data.temp == null
    ? "-"
    : `${formatTemp(data.temp)} °C${data.measurementTime ? ` at ${data.measurementTime}` : ""}${adjusted == null ? "" : ` (adjusted ${formatTemp(adjusted)} °C)`}`);
  const factors = getElementById('infoTempFactors');
  factors.removeAttribute?.('data-i18n');
  factors.replaceChildren();
  const factorLabel = document.createElement('span');
  setText(factorLabel, data.tempFactors ? TEMP_FACTORS[data.tempFactors] : '-');
  factors.appendChild(factorLabel);
  if (data.tempFactors === 'other' && data.tempFactorsOther) {
    const detail = document.createElement('span');
    detail.textContent = `: ${data.tempFactorsOther}`;
    factors.appendChild(detail);
  }
  renderInfoLines(getElementById("infoBleeding"), [
    `Bleeding: ${LABELS.bleeding[data.bleeding] ?? "-"}`,
    ...(BLEEDING_LABELS[data.bleedingIntensity] ? [`Period intensity: ${BLEEDING_LABELS[data.bleedingIntensity]}`] : []),
    `Clots: ${data.sediment == null ? "-" : data.sediment ? "Yes" : "No"}`,
  ]);
  renderInfoLines(getElementById("infoMucus"), [
    `Sensation: ${observationLabel('sensation', LABELS.sensation)}`,
    `Slippery: ${data.stretch == null ? "-" : data.stretch ? "Yes" : "No"}`,
    `Discharge: ${data.visible == null ? "-" : data.visible ? "Present" : "None"}`,
    `Consistency: ${observationLabel('consistency', LABELS.consistency)}`,
    `Color: ${observationLabel('color', LABELS.color)}${data.colorOther ? ` (${data.colorOther})` : ""}`,
  ]);
  renderInfoLines(getElementById("infoCervix"), [
    `Firmness: ${LABELS.firmness[data.cervixFirmness ?? ""]}`,
    `Height: ${LABELS.height[data.cervixHeight ?? ""]}`,
    `Openness: ${LABELS.openness[data.cervixOpenness ?? ""]}`,
  ]);
  const sex = data.sex === true ? "Yes" : data.sex === false ? "No" : "-";
  const notes = typeof data.other === "string" && data.other.trim() ? data.other : "-";
  renderInfoLines(getElementById("infoOther"), [`Sex: ${sex}`, `Notes: ${notes}`]);
}

export function openDayInfoModal(currentColumns) {
  if (!store.selectedKey) return showMessage("Select a day first");
  renderDayInfo(currentColumns);
  showModal("dayInfoModal");
}

export function closeDayInfoModal() {
  hideModal("dayInfoModal");
}
