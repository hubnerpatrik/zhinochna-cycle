import { store } from "../store.js";
import { openCycleSummary } from "../ui/cycle-summary.js";
import { openProfileInfo } from "../ui/profile-info-modal.js";
import { cycleStarts } from "../cycle-summary.js";
import { LAYOUT, chartY, formatDateKey, formatTemp, parseDateKey, qs, syncCSSVariables } from "../core.js";

export function fittedColumnWidth(viewportWidth, count, axisWidth = 48) {
  return Math.max(1, viewportWidth - axisWidth - 2) / Math.max(1, count);
}

export function createMobileMap({ render, getColumns, interactions }) {
  const media = window.matchMedia("(max-width: 560px)");
  const views = new Map();
  let ready = false;
  let desktopWidth = LAYOUT.columnWidth;
  let fitWidth = 50;
  let fitHeight = 340;
  let raf = null;
  let toastHome;
  const active = () => media.matches && !qs("activeMapScreen")?.classList.contains("hidden");
  const view = () => {
    const id = store.getActiveMapId();
    if (!views.has(id)) views.set(id, { tab: "graph", zoom: 1, left: 0, top: 0 });
    return views.get(id);
  };
  const schedule = () => {
    if (raf !== null || !active()) return;
    raf = requestAnimationFrame(() => { raf = null; render(); });
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
      qs("mobileMenuBtn").onclick = () => qs("navMenuBtn").click();
      qs("mobileSaveBtn").onclick = () => qs("saveActiveMapBtn").click();
      qs("mobileDayBtn").onclick = () => qs("editBtn").click();
      qs("mobileTools").onclick = () => {
        const list = qs("mobileToolsList");
        list.hidden = !list.hidden;
        qs("mobileTools").setAttribute("aria-expanded", String(!list.hidden));
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
      qs("mobileFitBtn").onclick = () => {
        interactions.deactivate();
        view().zoom = 1;
        view().left = 0; view().top = 0;
        render();
        const scroll = document.querySelector(".map-scroll");
        scroll.scrollLeft = 0; scroll.scrollTop = 0;
      };
      qs("mobileZoomInBtn").onclick = () => qs("zoomInBtn").click();
      qs("mobileZoomOutBtn").onclick = () => qs("zoomOutBtn").click();
      qs("mobileObservationsBtn").onclick = () => {
        const expanded = qs("activeMapScreen").classList.toggle("mobile-observations");
        qs("mobileObservationsBtn").setAttribute("aria-expanded", String(expanded));
        qs("mobileObservationsBtn").textContent = expanded ? "Hide observations" : "Show observations";
        schedule();
      };
      document.querySelectorAll("[data-mobile-tool]").forEach(button => {
        button.onclick = () => {
          qs("mobileToolsList").hidden = true;
          qs("mobileTools").setAttribute("aria-expanded", "false");
          const id = button.dataset.mobileTool;
          if (id !== "fertileRangeActionBtn") {
            switchTab("graph");
            view().zoom = Math.max(view().zoom, 28 / fitWidth);
            render();
            const index = getColumns().findIndex(column => column.key === store.selectedKey);
            document.querySelector(".map-scroll").scrollLeft = Math.max(0, index * LAYOUT.columnWidth - 70);
            document.querySelector(".map-scroll").scrollTop = Math.max(0, chartY(store.entries[store.selectedKey]?.temp ?? 36.7) - fitHeight / 2 + 28);
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
          LAYOUT.chartHeight = 840; LAYOUT.sideLabelWidth = 96; LAYOUT.tempScaleWidth = 72;
          syncCSSVariables();
        }
        render();
      });
    },
    prepare() {
      if (!ready) return;
      document.body.classList.toggle("mobile-map-active", active());
      const toast = qs("toast");
      if (active()) {
        if (toast.parentElement !== qs("mobileToolFeedback")) qs("mobileToolFeedback").append(toast);
        const screen = qs("activeMapScreen");
        const state = view();
        screen.classList.toggle("mobile-calendar-view", state.tab === "calendar");
        qs("mobileGraphTab").setAttribute("aria-selected", String(state.tab === "graph"));
        qs("mobileCalendarTab").setAttribute("aria-selected", String(state.tab === "calendar"));
        // Measure the available space, including safe-area padding and tool feedback.
        if (state.tab === "graph") {
          const top = document.querySelector(".cycle-map").getBoundingClientRect().top + window.scrollY;
          const bottomPadding = parseFloat(getComputedStyle(document.querySelector(".app")).paddingBottom) || 8;
          fitHeight = Math.max(140, Math.min(520, window.innerHeight - top - qs("mobileMapDock").offsetHeight
            - qs("mobileObservationsBtn").offsetHeight - bottomPadding - 36));
        }
        fitWidth = fittedColumnWidth(screen.clientWidth - 16, Object.keys(store.entries).length);
        LAYOUT.sideLabelWidth = 0;
        LAYOUT.tempScaleWidth = 48;
        LAYOUT.columnWidth = fitWidth * state.zoom;
        LAYOUT.chartHeight = Math.min(1680, fitHeight * state.zoom);
        screen.style.setProperty("--mobile-plot-height", `${fitHeight + 30}px`);
        screen.classList.toggle("mobile-map-overview", LAYOUT.columnWidth < 24);
        if (!store.selectedKey) store.selectedKey = Object.keys(store.entries).sort().at(-1) || formatDateKey(new Date());
      } else if (toastHome && toast.parentElement === qs("mobileToolFeedback")) {
        toastHome.after(toast);
      }
      syncCSSVariables();
    },
    update() {
      if (!active()) return;
      qs("mobileMapName").textContent = store.getActiveMap()?.name || "Active map";
      qs("mobileSummaryBtn").disabled = cycleStarts(store.entries).length === 0;
      qs("mobileSummaryBtn").title = qs("mobileSummaryBtn").disabled ? "Record menstruation to start a cycle" : "Open cycle summary";
      qs("mobileSaveBtn").disabled = qs("saveActiveMapBtn").disabled;
      const key = store.selectedKey;
      qs("mobileSelectedDate").textContent = key ? parseDateKey(key).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "Select a day";
      const column = getColumns().find(item => item.key === key);
      qs("mobileSelectedCycle").textContent = column?.cycleDay ? `Cycle day ${column.cycleDay}` : "";
      const temp = store.entries[key]?.temp;
      qs("mobileSelectedTemp").textContent = temp == null ? "No temperature" : `${formatTemp(temp)} °C`;
      qs("mobileDayBtn").disabled = !key;
      const step = Math.ceil(28 / LAYOUT.columnWidth);
      [...qs("dayNumbers").children].forEach((cell, index) => { cell.style.color = index % step ? "transparent" : ""; });
      feedback();
    },
    clampWidth(width) { return active() ? Math.max(fitWidth, Math.min(Math.max(90, fitWidth), width)) : Math.max(24, Math.min(90, width)); },
    setWidth(width) {
      if (active()) view().zoom = this.clampWidth(width) / fitWidth;
      else { desktopWidth = width; LAYOUT.columnWidth = width; }
    },
    zoomStep(direction) { return active() ? LAYOUT.columnWidth * (direction > 0 ? 1.35 : 1 / 1.35) : LAYOUT.columnWidth + direction * 8; },
  };
}
