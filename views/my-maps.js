import { MAP_NAME_MAX_LENGTH } from '../form-limits.js';
import { buildMapMeta, matchesFilter } from '../map-list-model.js';
import { ISO_DATE_KEY_LENGTH } from '../date-utils.js';
import { escapeHtml } from "./view-utils.js";
import { t } from "../i18n.js";
import { openExportMenu } from '../ui/export-menu.js';
import { openMapDialog } from '../ui/map-dialog.js';

function renderMapList(container, maps, activeMapId, year, month, onOpen, onRename, onDelete, onExport) {
  const filteredMaps = maps.filter(map => matchesFilter(map, year, month));
  const list = container.querySelector("#mapsList");

  if (!list) return;

  if (!filteredMaps.length) {
    list.innerHTML = `
      <div class="screen-card empty-state">
        <h3 data-i18n>No maps found</h3>
        <p data-i18n>Try a different month or year, or create a new map.</p>
      </div>
    `;
    return;
  }

  list.innerHTML = filteredMaps.map(map => `
    <article class="screen-card map-list-card${map.id === activeMapId ? " is-active" : ""}">
      <div class="map-list-main">
        <div>
          <div class="map-list-title-row">
            <h3 ${map.name ? "" : "data-i18n"}>${escapeHtml(map.name || "Untitled map")}</h3>
            <span class="map-pill ${map.status === "closed" ? "map-pill-closed" : ""}" data-i18n>${map.status === "closed" ? "Closed" : "Open"}</span>
            ${map.id === activeMapId ? '<span class="map-pill" data-i18n>Active</span>' : ""}
            ${map.profileSnapshotLocked ? '<span class="map-pill" data-i18n>Shared</span>' : ""}
          </div>
          <p class="map-list-meta"> <span data-i18n>${escapeHtml(map.dateRange)}</span></p>
          <p class="map-list-preview"><span data-i18n>Preview:</span> <span data-i18n>${escapeHtml(map.preview)}</span></p>
          <p class="map-list-meta"><span data-i18n>Last activity:</span> ${escapeHtml(String(map.lastActivity).slice(0, ISO_DATE_KEY_LENGTH))}</p>
        </div>
        <div class="map-list-actions">
          <div class="map-export-picker">
            <button type="button" class="btn secondary map-export-btn" data-export-toggle data-export-map="${escapeHtml(map.id)}" aria-expanded="false"><span data-i18n>Export</span><span class="export-chevron" aria-hidden="true">⌄</span></button>
          </div>
          <button type="button" class="btn secondary map-edit-btn" data-map-rename-id="${escapeHtml(map.id)}" data-i18n>Edit name</button>
          <button type="button" class="btn danger map-delete-btn" data-map-delete-id="${escapeHtml(map.id)}" data-i18n>Delete</button>
          <button type="button" class="btn primary map-open-btn" data-map-id="${escapeHtml(map.id)}" data-i18n>${map.status === "closed" ? "Reopen" : "Open map"}</button>
        </div>
      </div>
      <div class="map-delete-confirmation hidden" data-map-delete-confirmation="${escapeHtml(map.id)}" role="alert">
        <span data-i18n>Are you sure you want to delete this map? This cannot be undone.</span>
        <div class="map-delete-confirmation-actions">
          <button type="button" class="btn secondary" data-map-delete-no="${escapeHtml(map.id)}" data-i18n>No</button>
          <button type="button" class="btn danger" data-map-delete-yes="${escapeHtml(map.id)}" data-i18n>Yes</button>
        </div>
      </div>
    </article>
  `).join("");

  list.querySelectorAll("[data-map-id]").forEach(button => {
    button.addEventListener("click", () => onOpen?.(button.dataset.mapId));
  });

  list.querySelectorAll('[data-export-toggle]').forEach(toggle => {
    toggle.addEventListener('click', () => openExportMenu(toggle, format => onExport?.(toggle.dataset.exportMap, format)));
  });

  list.querySelectorAll("[data-map-rename-id]").forEach(button => {
    button.addEventListener("click", () => {
      const mapId = button.dataset.mapRenameId;
      const map = filteredMaps.find(item => item.id === mapId);
      if (!map) return;

      openMapDialog({
        title: 'Edit map name', submitLabel: 'Save changes', closeOnNavigation: true,
        body: `<label>${escapeHtml(t('Map name'))}<input name="mapName" type="text" required maxlength="${MAP_NAME_MAX_LENGTH}" value="${escapeHtml(map.name || '')}" autofocus></label>`,
        onSubmit: dialog => {
          const name = dialog.querySelector('input').value.trim();
          if (!name) return;
          if (onRename?.(mapId, name) !== false) dialog.close();
        },
      });
    });
  });

  list.querySelectorAll("[data-map-delete-id]").forEach(button => {
    button.addEventListener("click", () => {
      const confirmation = button.closest(".map-list-card")?.querySelector(".map-delete-confirmation");
      confirmation?.classList.remove("hidden");
      confirmation?.querySelector("[data-map-delete-no]")?.focus();
    });
  });

  list.querySelectorAll("[data-map-delete-no]").forEach(button => {
    button.addEventListener("click", () => {
      button.closest(".map-delete-confirmation")?.classList.add("hidden");
    });
  });

  list.querySelectorAll("[data-map-delete-yes]").forEach(button => {
    button.addEventListener("click", () => onDelete?.(button.dataset.mapDeleteYes));
  });
}

export function renderMyMapsView(container, { maps, activeMapId, onCreate, onImport, onOpen, onRename, onDelete, onExport }) {
  const mapMeta = maps.map(buildMapMeta);
  const allYears = [...new Set(mapMeta.flatMap(map => map.years))].sort();
  let selectedYear = "";
  let selectedMonth = "";

  container.innerHTML = `
    <section class="screen" aria-label="My maps" data-i18n-aria-label="My maps">
      <div class="screen-shell">
        <div class="screen-hero">
          <p class="screen-kicker" data-i18n>My Maps</p>
          <h2 data-i18n>Saved cycle maps</h2>
          <p data-i18n>Export maps or import a shared map.</p>
        </div>

        <div class="screen-card map-filter-card">
          <div class="map-filters">
            <label>
              <span class="input-label" data-i18n>Year</span>
              <select id="mapsYearFilter">
                <option value="" data-i18n>All years</option>
                ${allYears.map(year => `<option value="${year}">${year}</option>`).join("")}
              </select>
            </label>
            <label>
              <span class="input-label" data-i18n>Month</span>
              <select id="mapsMonthFilter">
                <option value="" data-i18n>All months</option>
                <option value="01" data-i18n>January</option>
                <option value="02" data-i18n>February</option>
                <option value="03" data-i18n>March</option>
                <option value="04" data-i18n>April</option>
                <option value="05" data-i18n>May</option>
                <option value="06" data-i18n>June</option>
                <option value="07" data-i18n>July</option>
                <option value="08" data-i18n>August</option>
                <option value="09" data-i18n>September</option>
                <option value="10" data-i18n>October</option>
                <option value="11" data-i18n>November</option>
                <option value="12" data-i18n>December</option>
              </select>
            </label>
          </div>
          <div class="screen-inline-actions">
            <button type="button" class="btn secondary" id="myMapsImportBtn" data-i18n>Import map</button>
            <button type="button" class="btn primary map-create-plus" id="myMapsCreateBtn"><span aria-hidden="true">＋</span><span data-i18n>Create map</span></button>
            <input class="visually-hidden" id="myMapsImportFile" type="file" accept="application/json,.json,application/pdf,.pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,.xlsx" tabindex="-1">
          </div>
        </div>

        <div id="mapsList" class="maps-list"></div>
      </div>
    </section>
  `;

  const yearFilter = container.querySelector("#mapsYearFilter");
  const monthFilter = container.querySelector("#mapsMonthFilter");

  const refresh = () => {
    selectedYear = yearFilter?.value ?? "";
    selectedMonth = monthFilter?.value ?? "";
    renderMapList(container, mapMeta, activeMapId, selectedYear, selectedMonth, onOpen, onRename, onDelete, onExport);
  };

  yearFilter?.addEventListener("change", refresh);
  monthFilter?.addEventListener("change", refresh);
  container.querySelector("#myMapsCreateBtn")?.addEventListener("click", () => onCreate?.());
  const importInput = container.querySelector("#myMapsImportFile");
  container.querySelector("#myMapsImportBtn")?.addEventListener("click", () => importInput?.click());
  importInput?.addEventListener("change", () => {
    const file = importInput.files?.[0];
    importInput.value = "";
    if (file) onImport?.(file);
  });

  refresh();
}
