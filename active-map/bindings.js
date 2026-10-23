import { store } from "../store.js";
import { bleedingIcon } from '../ui/bleeding-icons.js';
import { enhanceObservationScales } from '../ui/observation-scales.js';
import { enhanceInterfaceIcons } from '../ui/interface-icons.js';
import { toggleObservationChoice } from "../ui/modal-shared.js";
import { t } from "../i18n.js";
import { enhanceTimeInputs } from "../ui/time-picker.js";
import { bindMapGestures, zoomScrollLeft } from "./map-gestures.js";
import { LAYOUT, getElementById, querySelectorAll, syncCSSVariables } from "../core.js";
import { LAST_MONTH_INDEX } from '../date-utils.js';
import { observationChoiceValue } from '../ui/observation-values.js';
import {
  changeFertileRangeMonth,
  clearFertileRangeModal,
  clearMarkersModalInput,
  closeActionModal,
  closeBleedingModal,
  closeCervixModal,
  closeDayInfoModal,
  closeFertileRangeModal,
  closeMarkersModal,
  closeModal,
  closeMucusModal,
  closeOtherModal,
  openActionModal,
  openBleedingModal,
  openCervixModal,
  openDayInfoModal,
  openFertileRangeModal,
  openMarkersModal,
  openModal,
  openMucusModal,
  openOtherModal,
  renderActionButtons,
  renderTempFactorsOptions,
  saveBleedingModal,
  saveCervixModal,
  saveFertileRangeModal,
  saveMarkersModal,
  saveModal,
  saveMucusModal,
  saveOtherModal,
  selectMarkerType,
  showMessage,
  syncMeasurementTimeUI,
  syncTempFactorsUI,
  syncModalUI,
  syncMucusModalUI,
} from "../ui.js";

const CHART_HEADER_HEIGHT = 28;
const ZOOM_ANIMATION_DURATION_MS = 180;
const ZOOM_EASING_EXPONENT = 3;

let initialized = false;

function bindButton(id, handler) {
  const button = getElementById(id);
  if (button) button.onclick = handler;
}

function bindOverlayClicks(definitions) {
  definitions.forEach(([id, close]) => {
    getElementById(id)?.addEventListener("click", event => {
      if (event.target.id === id) close();
    });
  });
}

function animatePrimaryButton(button) {
  button?.addEventListener("click", () => {
    button.classList.add("pulse-attention");
    button.addEventListener("animationend", () => button.classList.remove("pulse-attention"), { once: true });
  });
}

export function saveActiveMap({
  activeStore = store,
  notify = showMessage,
  renderApp = () => {},
} = {}) {
  if (!activeStore.getActiveMap()) return false;
  try {
    activeStore.save();
    notify("Map saved ✓");
    return true;
  } catch {
    notify("The map could not be saved. Please try again.");
    renderApp();
    return false;
  }
}

export function initializeActiveMapControls({
  chartInteractions,
  mobileMap,
  getColumns,
  render,
  renderZoom = render,
  renderZoomLabel,
  restart,
}) {
  if (initialized) return;
  syncCSSVariables();
  renderTempFactorsOptions();
  renderActionButtons();
  querySelectorAll('[data-bleeding-icon]').forEach(icon => { icon.innerHTML = bleedingIcon(icon.dataset.bleedingIcon); });
  enhanceObservationScales();
  enhanceInterfaceIcons();
  enhanceTimeInputs(document);

  bindButton("prevMonth", () => {
    store.month--;
    if (store.month < 0) {
      store.month = LAST_MONTH_INDEX;
      store.year--;
    }
    render();
  });
  bindButton("nextMonth", () => {
    store.month++;
    if (store.month > LAST_MONTH_INDEX) {
      store.month = 0;
      store.year++;
    }
    render();
  });

  querySelectorAll(".btn.primary").forEach(animatePrimaryButton);
  bindButton("editBtn", openActionModal);
  bindButton("closeBtn", closeModal);
  bindButton("saveBtn", () => saveModal(render));
  bindButton("closeActionModalBtn", closeActionModal);
  [
    ["temperatureActionBtn", () => openModal(getColumns())],
    ["bleedingActionBtn", openBleedingModal],
    ["mucusActionBtn", openMucusModal],
    ["cervixActionBtn", openCervixModal],
    ["fertileRangeActionBtn", openFertileRangeModal],
    ["otherActionBtn", openOtherModal],
  ].forEach(([id, handler]) => bindButton(id, handler));

  bindButton("saveBleedingModalBtn", () => saveBleedingModal(render));
  bindButton("saveMucusModalBtn", () => saveMucusModal(render));
  bindButton("saveFertileRangeModalBtn", () => saveFertileRangeModal(render));
  bindButton("clearFertileRangeBtn", clearFertileRangeModal);
  bindButton("fertileRangePrevMonth", () => changeFertileRangeMonth(-1));
  bindButton("fertileRangeNextMonth", () => changeFertileRangeMonth(1));
  bindButton("clearMarkersModalBtn", clearMarkersModalInput);
  bindButton("saveMarkersModalBtn", () => saveMarkersModal(render));
  bindButton("saveCervixModalBtn", () => saveCervixModal(render));
  bindButton("saveOtherModalBtn", () => saveOtherModal(render));

  [
    ["closeBleedingModalBtn", closeBleedingModal],
    ["closeMucusModalBtn", closeMucusModal],
    ["closeFertileRangeModalBtn", closeFertileRangeModal],
    ["closeMarkersModalBtn", closeMarkersModal],
    ["closeCervixModalBtn", closeCervixModal],
    ["closeOtherModalBtn", closeOtherModal],
  ].forEach(([id, handler]) => bindButton(id, handler));

  bindOverlayClicks([
    ["modal", closeModal],
    ["actionModal", closeActionModal],
    ["bleedingModal", closeBleedingModal],
    ["mucusModal", closeMucusModal],
    ["markersModal", closeMarkersModal],
    ["cervixModal", closeCervixModal],
    ["fertileRangeModal", closeFertileRangeModal],
    ["otherModal", closeOtherModal],
    ["dayInfoModal", closeDayInfoModal],
  ]);

  const mapScroll = document.querySelector(".map-scroll");
  const fixedWidth = () => LAYOUT.sideLabelWidth + LAYOUT.tempScaleWidth;
  const setWidth = width => {
    mobileMap.setWidth(width);
    syncCSSVariables();
    renderZoom();
    renderZoomLabel();
  };
  let zoomFrame = null;
  let zoomTarget = null;
  const cancelZoom = () => {
    if (zoomFrame !== null) cancelAnimationFrame(zoomFrame);
    zoomFrame = null;
    zoomTarget = null;
  };
  const applyZoom = width => {
    const oldHeight = LAYOUT.chartHeight;
    const top = mapScroll?.scrollTop || 0;
    const anchorY = (mapScroll?.clientHeight || 0) / 2;
    const left = mapScroll && zoomScrollLeft(mapScroll.scrollLeft, mapScroll.clientWidth / 2,
      fixedWidth(), LAYOUT.columnWidth, width);
    setWidth(width);
    if (mapScroll) mapScroll.scrollLeft = left;
    if (mapScroll && mobileMap.active()) mapScroll.scrollTop = Math.max(0,
      (top + anchorY - CHART_HEADER_HEIGHT) * LAYOUT.chartHeight / oldHeight - anchorY + CHART_HEADER_HEIGHT);
  };
  const zoomBy = step => {
    const target = mobileMap.clampWidth(mobileMap.zoomStep(step, zoomTarget ?? LAYOUT.columnWidth));
    cancelZoom();
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return applyZoom(target);
    const startWidth = LAYOUT.columnWidth;
    const start = performance.now();
    zoomTarget = target;
    const animate = now => {
      const progress = Math.min(1, (now - start) / ZOOM_ANIMATION_DURATION_MS);
      applyZoom(startWidth + (target - startWidth) * (1 - (1 - progress) ** ZOOM_EASING_EXPONENT));
      if (progress < 1) zoomFrame = requestAnimationFrame(animate);
      else { zoomFrame = null; zoomTarget = null; }
    };
    zoomFrame = requestAnimationFrame(animate);
  };
  bindButton("zoomInBtn", () => zoomBy(1));
  bindButton("zoomOutBtn", () => zoomBy(-1));
  mapScroll?.addEventListener("touchstart", cancelZoom, { passive: true });
  mapScroll?.addEventListener("wheel", cancelZoom, { passive: true });
  window.addEventListener("hashchange", cancelZoom);
  if (mapScroll) bindMapGestures(mapScroll, {
    getWidth: () => LAYOUT.columnWidth, setWidth, fixedWidth,
    clampWidth: width => mobileMap.clampWidth(width),
    getHeight: () => LAYOUT.chartHeight,
    onPinch: () => chartInteractions.finishTouchDrag(),
  });

  bindButton("devReset", () => {
    if (!confirm(t("Reset all data? This cannot be undone."))) return;
    try {
      store.reset();
      restart();
    } catch {
      showMessage("Data could not be reset. Please try again.");
    }
  });
  bindButton("saveActiveMapBtn", () => saveActiveMap({ renderApp: render }));

  querySelectorAll(".segmented button").forEach(button => {
    button.onclick = () => {
      if (button.closest(".modal")?.classList.contains("hidden")) return;
      const value = observationChoiceValue(button.dataset.value);
      if (button.dataset.group === "markerColor") return selectMarkerType(value);
      const group = button.dataset.group;
      toggleObservationChoice(group, value);
    };
  });

  const otherColor = getElementById("mucusColorOtherCheckbox");
  getElementById('tempFactorsInput').onchange = syncTempFactorsUI;
  querySelectorAll('input[data-observation]').forEach(input => {
    input.onchange = () => { store.modal[input.dataset.observation] = input.checked ? true : undefined; };
  });
  const otherColorInput = getElementById("mucusColorOtherInput");
  otherColor.onchange = () => {
    store.modal.color = otherColor.checked ? "other" : "";
    if (!otherColor.checked) store.modal.colorOther = "";
    syncMucusModalUI();
  };
  otherColorInput.oninput = () => { store.modal.colorOther = otherColorInput.value; };

  const timeCheckbox = getElementById("measurementTimeCheckbox");
  const timeInput = getElementById("measurementTimeInput");
  timeCheckbox.onchange = () => {
    store.modal.measurementTimeEnabled = timeCheckbox.checked;
    if (!timeCheckbox.checked) timeInput.value = "";
    syncMeasurementTimeUI();
  };
  timeInput.oninput = () => {
    store.modal.measurementTime = timeInput.value;
    syncMeasurementTimeUI();
  };

  bindButton("dayInfoBtn", () => openDayInfoModal(getColumns()));
  bindButton("closeDayInfoModalBtn", closeDayInfoModal);
  chartInteractions.init();
  initialized = true;
}
