import { setText, setDateText, setMonthPeriod } from '../i18n.js';
import { store } from "../store.js";
import { openCycleSummary } from "../ui/cycle-summary.js";
import { openProfileInfo } from "../ui/profile-info-modal.js";
import { cycleStarts } from "../cycle-summary.js";
import { buildColumns } from '../domain.js';
import { DEFAULT_LAYOUT, LAYOUT, TEMP_FACTORS, chartY, formatDateKey, formatTemp, parseDateKey, qs, syncCSSVariables } from "../core.js";
import { applyLayoutClass } from '../ui/layout-classes.js';
import { ZOOM_MIN, ZOOM_MAX, clampZoom } from './map-gestures.js';

const MOBILE_BREAKPOINT = 560;
const MOBILE_AXIS_WIDTH = 48;
const CHART_BORDER_WIDTH = 2;
const MIN_READABLE_COLUMN_WIDTH = 32;
const MAX_READABLE_COLUMN_WIDTH = 56;
const INITIAL_CHART_HEIGHT = 340;
const MIN_EXPANDED_CHART_HEIGHT = 240;
const EXPANDED_CHART_RESERVED_HEIGHT = 120;
const MIN_CHART_HEIGHT = 320;
const MAX_CHART_HEIGHT = 560;
const CHART_RESERVED_HEIGHT = 110;
const SCREEN_HORIZONTAL_PADDING = 16;
const PLOT_EXTRA_HEIGHT = 30;
const MIN_LABEL_SPACING = 28;
const TOOL_MIN_COLUMN_WIDTH = 28;
const TOOL_SCROLL_LEFT_PADDING = 70;
const TOOL_SCROLL_TOP_PADDING = 28;
const DEFAULT_TOOL_TEMPERATURE = 36.7;
const MOBILE_ZOOM_FACTOR = 1.35;
const DESKTOP_ZOOM_STEP = 8;

export function fittedColumnWidth(viewportWidth, count, axisWidth = MOBILE_AXIS_WIDTH) {
  return Math.max(1, viewportWidth - axisWidth - CHART_BORDER_WIDTH) / Math.max(1, count);
}

export function readableColumnWidth(viewportWidth, count) {
  return Math.min(MAX_READABLE_COLUMN_WIDTH, Math.max(MIN_READABLE_COLUMN_WIDTH, fittedColumnWidth(viewportWidth, count)));
}

export function createMobileMap({ render, getColumns, interactions }) {
  const media = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`);
  const views = new Map();
  let ready = false;
  let desktopWidth = LAYOUT.columnWidth;
  let fitWidth = DEFAULT_LAYOUT.columnWidth;
  let fitHeight = INITIAL_CHART_HEIGHT;
  let renderFrame = null;
  let toastHome;
  let rowsHome;
  const active = () => media.matches && !qs("activeMapScreen")?.classList.contains("hidden");
  const view = () => {
    const id = store.getActiveMapId();
    if (!views.has(id)) views.set(id, { tab: "graph", zoom: null, left: 0, top: 0 });
    return views.get(id);
  };
  const schedule = () => {
    if (renderFrame !== null || !active()) return;
    renderFrame = requestAnimationFrame(() => { renderFrame = null; render(); });
  };
  function switchTab(tab) {
    const scroll = document.querySelector(".map-scroll");
    if (view().tab === "graph") {
      view().left = scroll.scrollLeft;
      view().top = scroll.scrollTop;
    }
    view().tab = tab;
    if (tab === "calendar" && store.selectedKey) {
      const date = parseDateKey(store.selectedKey);
      store.month = date.getMonth();
      store.year = date.getFullYear();
    }
    render();
    if (tab === "graph") {
      scroll.scrollLeft = view().left;
      scroll.scrollTop = view().top;
    }
  }
  function feedback() {
    const toast = qs("toast");
    const persistent = active() && toast?.classList.contains("persistent-toast")
      && toast.classList.contains("show") && Boolean(toast.textContent.trim());
    qs("mobileMapActions")?.classList.toggle("hidden", persistent);
    qs("mobileCancelToolBtn")?.classList.toggle("hidden", !persistent || toast?.classList.contains("action-toast"));
  }
  return {
    active,
    init() {
      if (ready) return;
      ready = true;
      toastHome = document.createComment("Desktop notifications");
      qs("toast").before(toastHome);
      rowsHome = document.createComment('Desktop observations');
      qs('mapRows').before(rowsHome);
      const chartScroll = document.querySelector('.map-scroll');
      const tableScroll = qs('mobileObservationScroll');
      let scrollSource = null, scrollFrame = null;
      [[chartScroll, tableScroll], [tableScroll, chartScroll]].forEach(([source, target]) => {
        source.addEventListener('scroll', () => {
          if (!active() || (scrollSource && scrollSource !== source)) return;
          scrollSource = source;
          target.scrollLeft = source.scrollLeft;
          if (scrollFrame !== null) cancelAnimationFrame(scrollFrame);
          scrollFrame = requestAnimationFrame(() => { scrollSource = null; scrollFrame = null; });
        }, { passive: true });
      });
      qs("mobileSaveBtn").onclick = () => qs("saveActiveMapBtn").click();
      qs("mobileDayBtn").onclick = () => qs("editBtn").click();
      qs("mobileTools").onclick = () => {
        const list = qs("mobileToolsList");
        list.showModal();
        qs("mobileTools").setAttribute("aria-expanded", "true");
      };
      qs("mobileCloseToolsBtn").onclick = () => qs("mobileToolsList").close();
      qs("mobileToolsList").addEventListener('close', () => qs("mobileTools").setAttribute("aria-expanded", "false"));
      qs("mobileExpandBtn").onclick = () => {
        const expanded = qs("activeMapScreen").classList.toggle('mobile-chart-expanded');
        qs("mobileExpandBtn").setAttribute('aria-pressed', String(expanded));
        setText(qs("mobileExpandBtn"), expanded ? 'Close full screen' : 'Expand chart');
        render();
      };
      qs("mobileGraphTab").onclick = () => switchTab("graph");
      qs("mobileCalendarTab").onclick = () => switchTab("calendar");
      qs("mobileProfileBtn").onclick = () => openProfileInfo(qs("mobileProfileBtn"));
      qs("mobileSummaryBtn").onclick = () => openCycleSummary(qs("mobileSummaryBtn"));
      const tabs = [qs("mobileGraphTab"), qs("mobileCalendarTab")];
      tabs.forEach((tab, index) => tab.onkeydown = event => {
        if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
        event.preventDefault();
        tabs[1 - index].click(); tabs[1 - index].focus();
      });
      qs("mobileObservationsBtn").onclick = () => {
        const expanded = qs("activeMapScreen").classList.toggle("mobile-observations");
        qs("mobileObservationsBtn").setAttribute("aria-expanded", String(expanded));
        setText(qs("mobileObservationsBtn"), expanded ? "Hide observations" : "Show observations");
        qs('mobileObservationPanel').hidden = !expanded;
        if (expanded) {
          tableScroll.scrollLeft = chartScroll.scrollLeft;
          qs('mobileObservationsBtn').scrollIntoView({ block: 'start', behavior: 'auto' });
        }
      };
      document.querySelectorAll("[data-mobile-tool]").forEach(button => {
        button.onclick = () => {
          qs("mobileToolsList").close();
          qs("mobileTools").setAttribute("aria-expanded", "false");
          const id = button.dataset.mobileTool;
          if (id !== "fertileRangeActionBtn") {
            switchTab("graph");
            view().zoom = Math.max(view().zoom, TOOL_MIN_COLUMN_WIDTH / fitWidth);
            render();
            const index = getColumns().findIndex(column => column.key === store.selectedKey);
            chartScroll.scrollLeft = Math.max(0, index * LAYOUT.columnWidth - TOOL_SCROLL_LEFT_PADDING);
            chartScroll.scrollTop = Math.max(0, chartY(store.entries[store.selectedKey]?.temp ?? DEFAULT_TOOL_TEMPERATURE) - fitHeight / 2 + TOOL_SCROLL_TOP_PADDING);
          }
          qs(id).click();
        };
      });
      qs("mobileCancelToolBtn").onclick = () => { interactions.deactivate(); render(); };
      new MutationObserver(feedback).observe(qs("mobileToolFeedback"), { subtree: true, childList: true, attributes: true, attributeFilter: ["class"] });
      new ResizeObserver(schedule).observe(qs("mobileMapDock"));
      window.addEventListener("resize", schedule);
      media.addEventListener("change", () => {
        if (media.matches) desktopWidth = LAYOUT.columnWidth;
        else {
          LAYOUT.columnWidth = desktopWidth;
          LAYOUT.chartHeight = DEFAULT_LAYOUT.chartHeight;
          LAYOUT.sideLabelWidth = DEFAULT_LAYOUT.sideLabelWidth;
          LAYOUT.tempScaleWidth = DEFAULT_LAYOUT.tempScaleWidth;
          syncCSSVariables();
        }
        render();
      });
    },
    prepare() {
      if (!ready) return;
      const rows = qs('mapRows');
      if (media.matches) {
        if (rows.parentElement !== qs('mobileObservationGrid')) qs('mobileObservationGrid').append(rows);
      } else if (rows.parentElement !== rowsHome.parentElement) rowsHome.after(rows);
      document.body.classList.toggle("mobile-map-active", active());
      const toast = qs("toast");
      if (active()) {
        if (toast.parentElement !== qs("mobileToolFeedback")) qs("mobileToolFeedback").append(toast);
        const screen = qs("activeMapScreen");
        const state = view();
        screen.classList.toggle("mobile-calendar-view", state.tab === "calendar");
        qs("mobileGraphTab").setAttribute("aria-selected", String(state.tab === "graph"));
        qs("mobileCalendarTab").setAttribute("aria-selected", String(state.tab === "calendar"));
        qs("mobileGraphTab").tabIndex = state.tab === "graph" ? 0 : -1;
        qs("mobileCalendarTab").tabIndex = state.tab === "calendar" ? 0 : -1;
        // Keep the plot readable; the page scrolls to records and tools below it.
        if (state.tab === "graph") {
          const top = document.querySelector(".cycle-map").getBoundingClientRect().top + window.scrollY;
          fitHeight = screen.classList.contains('mobile-chart-expanded')
            ? Math.max(MIN_EXPANDED_CHART_HEIGHT, window.innerHeight - EXPANDED_CHART_RESERVED_HEIGHT)
            : Math.max(MIN_CHART_HEIGHT, Math.min(MAX_CHART_HEIGHT, window.innerHeight - top - CHART_RESERVED_HEIGHT));
        }
        const count = buildColumns().length;
        const viewportWidth = screen.clientWidth - SCREEN_HORIZONTAL_PADDING;
        fitWidth = fittedColumnWidth(viewportWidth, count);
        if (state.zoom === null) state.zoom = readableColumnWidth(viewportWidth, count) / fitWidth;
        LAYOUT.sideLabelWidth = 0;
        LAYOUT.tempScaleWidth = MOBILE_AXIS_WIDTH;
        LAYOUT.columnWidth = fitWidth * state.zoom;
        LAYOUT.chartHeight = fitHeight;
        applyLayoutClass(screen, 'mobile-plot', { '--mobile-plot-height': fitHeight + PLOT_EXTRA_HEIGHT });
        screen.classList.toggle("mobile-map-overview", LAYOUT.columnWidth < ZOOM_MIN);
        if (!store.selectedKey) store.selectedKey = Object.keys(store.entries).sort().at(-1) || formatDateKey(new Date());
      } else if (toastHome && toast.parentElement === qs("mobileToolFeedback")) {
        toastHome.after(toast);
      }
      syncCSSVariables();
    },
    update() {
      if (!active()) return;
      setMonthPeriod(qs('mobileObservationPeriod'), getColumns().map(column => column.key));
      const mapName = qs("mobileMapName");
      if (store.getActiveMap()?.name) {
        mapName.removeAttribute("data-i18n");
        mapName.textContent = store.getActiveMap().name;
      } else setText(mapName, "Active map");
      qs("mobileSummaryBtn").disabled = cycleStarts(store.entries).length === 0;
      qs("mobileSummaryBtn").setAttribute("data-i18n-title", qs("mobileSummaryBtn").disabled ? "Record menstruation to start a cycle" : "Open cycle summary");
      qs("mobileSaveBtn").disabled = qs("saveActiveMapBtn").disabled;
      const key = store.selectedKey;
      if (key) {
        qs("mobileSelectedDate").removeAttribute("data-i18n");
        setDateText(qs("mobileSelectedDate"), parseDateKey(key), "short");
      } else {
        qs("mobileSelectedDate").removeAttribute("data-i18n-date");
        setText(qs("mobileSelectedDate"), "Select a day");
      }
      const column = getColumns().find(item => item.key === key);
      setText(qs("mobileSelectedCycle"), column?.cycleDay ? `Cycle day ${column.cycleDay}` : "");
      const temp = store.entries[key]?.temp;
      setText(qs("mobileSelectedTemp"), temp == null ? "No temperature" : `${formatTemp(temp)} °C`);
      const entry = store.entries[key];
      const factor = qs('mobileSelectedFactor');
      if (factor) {
        const custom = entry?.tempFactors === 'other' ? entry.tempFactorsOther?.trim() : '';
        factor.classList.toggle('hidden', !entry?.tempFactors);
        if (custom) { factor.removeAttribute('data-i18n'); factor.textContent = custom; }
        else setText(factor, TEMP_FACTORS[entry?.tempFactors] || '');
      }
      qs("mobileDayBtn").disabled = !key;
      const labelInterval = Math.ceil(MIN_LABEL_SPACING / LAYOUT.columnWidth);
      [...qs("dayNumbers").children].forEach((cell, index) => {
        cell.classList.toggle('is-crowded-label', Boolean(index % labelInterval));
      });
      const tableDays = qs('mobileObservationDays');
      tableDays.replaceChildren(...[...qs('dayNumbers').children].map((cell, index) => {
        const day = document.createElement('button');
        day.type = 'button'; day.className = cell.className;
        day.textContent = cell.textContent;
        day.setAttribute('aria-label', getColumns()[index].key);
        day.onclick = () => qs('dayNumbers').children[index]?.click();
        return day;
      }));
      feedback();
    },
    clampWidth(width) { return active() ? Math.max(fitWidth, Math.min(Math.max(ZOOM_MAX, fitWidth), width)) : clampZoom(width); },
    setWidth(width) {
      if (active()) view().zoom = this.clampWidth(width) / fitWidth;
      else { desktopWidth = width; LAYOUT.columnWidth = width; }
    },
    zoomStep(direction, width = LAYOUT.columnWidth) {
      return active() ? width * (direction > 0 ? MOBILE_ZOOM_FACTOR : 1 / MOBILE_ZOOM_FACTOR) : width + direction * DESKTOP_ZOOM_STEP;
    },
  };
}
