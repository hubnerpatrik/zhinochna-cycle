import { store } from "../store.js";
import { t } from "../i18n.js";
import { enhanceTimeInputs } from "../ui/time-picker.js";
import { bindMapGestures, zoomScrollLeft } from "./map-gestures.js";
import { LAYOUT, qs, qsa, syncCSSVariables } from "../core.js";
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
  syncModalUI,
  syncMucusModalUI,
} from "../ui.js";

let initialized = false;

function bindButton(id, handler) {
  const button = qs(id);
  if (button) button.onclick = handler;
}

function bindOverlayClicks(definitions) {
  definitions.forEach(([id, close]) => {
    qs(id)?.addEventListener("click", event => {
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
  enhanceTimeInputs(document);

  bindButton("prevMonth", () => {
    store.month--;
    if (store.month < 0) {
      store.month = 11;
      store.year--;
    }
    render();
  });
  bindButton("nextMonth", () => {
    store.month++;
    if (store.month > 11) {
      store.month = 0;
      store.year++;
    }
    render();
  });

  qsa(".btn.primary").forEach(animatePrimaryButton);
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
    if (mapScroll && mobileMap.active()) mapScroll.scrollTop = Math.max(0, (top + anchorY - 28) * LAYOUT.chartHeight / oldHeight - anchorY + 28);
  };
  const zoomBy = step => {
    const target = mobileMap.clampWidth(mobileMap.zoomStep(step, zoomTarget ?? LAYOUT.columnWidth));
    cancelZoom();
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return applyZoom(target);
    const startWidth = LAYOUT.columnWidth;
    const start = performance.now();
    zoomTarget = target;
    const animate = now => {
      const progress = Math.min(1, (now - start) / 180);
      applyZoom(startWidth + (target - startWidth) * (1 - (1 - progress) ** 3));
      if (progress < 1) zoomFrame = requestAnimationFrame(animate);
      else { zoomFrame = null; zoomTarget = null; }
    };
    zoomFrame = requestAnimationFrame(animate);
  };
  bindButton("zoomInBtn", () => zoomBy(1));
  bindButton("zoomOutBtn", () => zoomBy(-1));
  mapScroll?.addEventListener("touchstart", cancelZoom, { passive: true });
  mapScroll?.addEventListener("wheel", cancelZoom, { passive: true });
  qs("mobileFitBtn")?.addEventListener("click", cancelZoom);
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

  qsa(".segmented button").forEach(button => {
    button.onclick = () => {
      if (button.closest(".modal")?.classList.contains("hidden")) return;
      let value = button.dataset.value;
      if (value === "true") value = true;
      if (value === "false") value = false;
      if (button.dataset.group === "markerColor") return selectMarkerType(value);
      store.modal[button.dataset.group] = value;
      syncModalUI();
    };
  });

  const otherColor = qs("mucusColorOtherCheckbox");
  const otherColorInput = qs("mucusColorOtherInput");
  otherColor.onchange = () => {
    store.modal.color = otherColor.checked ? "other" : "";
    if (!otherColor.checked) store.modal.colorOther = "";
    syncMucusModalUI();
  };
  otherColorInput.oninput = () => { store.modal.colorOther = otherColorInput.value; };

  const timeCheckbox = qs("measurementTimeCheckbox");
  const timeInput = qs("measurementTimeInput");
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
