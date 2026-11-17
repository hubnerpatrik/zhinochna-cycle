import { MAP_NAME_MAX_LENGTH } from '../form-limits.js';
import { MAP_KINDS, buildMapMeta, matchesFilter, matchesKind } from '../map-list-model.js';
import { parseDateKey } from '../date-utils.js';
import { escapeHtml, gardenSprig, gardenBloom } from "./view-utils.js";
import { formatDate, t } from "../i18n.js";
import { openExportMenu } from '../ui/export-menu.js';
import { openMapDialog } from '../ui/map-dialog.js';

// Dates in words for the current language; the i18n observer updates them on language change.
function dateSpan(date) {
  if (!date || Number.isNaN(date.getTime())) return "—";
  return `<span data-i18n-date="${date.getTime()}" data-i18n-date-format="day">${escapeHtml(formatDate(date))}</span>`;
}

// Last activity is a day key or, for closed maps, an ISO timestamp.
function activityDate(value) {
  const text = String(value ?? "");
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? parseDateKey(text) : new Date(text);
}

/** One My Maps card: identity and dates on top, the common actions beside them, the rest in a menu. */
export function renderMapCard(map, activeMapId) {
  const dates = map.dates.length
    ? `${dateSpan(parseDateKey(map.dates[0]))} – ${dateSpan(parseDateKey(map.dates.at(-1)))}`
    : '<span data-i18n>No entries yet</span>';
  return `
    <article class="screen-card map-list-card${map.id === activeMapId ? " is-active" : ""}">
      <div class="map-list-main">
        <div>
          <div class="map-list-title-row">
            <h3 ${map.name ? "" : "data-i18n"}>${escapeHtml(map.name || "Untitled map")}</h3>
            <span class="map-pill ${map.status === "closed" ? "map-pill-closed" : ""}" data-i18n>${map.status === "closed" ? "Closed" : "Open"}</span>
            ${map.id === activeMapId ? '<span class="map-pill" data-i18n>Active</span>' : ""}
            ${map.profileSnapshotLocked ? '<span class="map-pill" data-i18n>Shared</span>' : ""}
          </div>
          <p class="map-list-meta">${dates} · <span data-i18n>Last activity:</span> ${dateSpan(activityDate(map.lastActivity))}</p>
          ${map.profileSnapshotLocked ? `<p class="map-list-meta map-list-author"><span data-i18n>Shared by:</span> ${map.profileSnapshot?.name ? escapeHtml(map.profileSnapshot.name) : `<span data-i18n>Unknown author</span>`}</p>` : ""}
        </div>
        <div class="map-list-actions">
          <div class="map-export-picker">
            <button type="button" class="btn secondary map-export-btn" data-i18n-aria-label="Export" aria-label="Export" data-i18n-title="Export" title="Export" data-export-toggle data-export-map="${escapeHtml(map.id)}" aria-expanded="false"><svg aria-hidden="true"><use href="/icons.svg#map-export"/></svg></button>
          </div>
          <details class="map-more-menu">
            <summary class="btn secondary map-more-btn" data-i18n-aria-label="More actions" aria-label="More actions" data-i18n-title="More actions" title="More actions"><span aria-hidden="true">⋯</span></summary>
            <div class="map-more-list">
              <button type="button" class="btn secondary" data-map-rename-id="${escapeHtml(map.id)}" data-i18n>Edit name</button>
              <button type="button" class="btn secondary" data-map-copy-id="${escapeHtml(map.id)}" data-i18n>Copy</button>
              <button type="button" class="btn danger" data-map-delete-id="${escapeHtml(map.id)}" data-i18n>Delete</button>
            </div>
          </details>
          <button type="button" class="btn primary map-open-btn" data-map-id="${escapeHtml(map.id)}" data-i18n>${map.status === "closed" ? "Reopen" : "Open map"}</button>
        </div>
      </div>
    </article>
  `;
}

/** The card menu closes on a choice, an outside click, Escape, or when another card's menu opens. */
function bindMoreMenu(menu, list) {
  const stopListening = () => {
    document.removeEventListener("click", onDocumentClick);
    document.removeEventListener("keydown", onEscape);
  };
  const close = () => { menu.open = false; stopListening(); };
  const onDocumentClick = event => { if (!menu.isConnected || !menu.contains(event.target) || event.target.closest("button")) close(); };
  const onEscape = event => {
    if (event.key !== "Escape") return;
    close();
    menu.querySelector("summary")?.focus();
  };
  menu.addEventListener("toggle", () => {
    if (!menu.open) return stopListening();
    list.querySelectorAll(".map-more-menu[open]").forEach(other => { if (other !== menu) other.open = false; });
    document.addEventListener("click", onDocumentClick);
    document.addEventListener("keydown", onEscape);
  });
}

function renderMapList(container, maps, activeMapId, { year, month, kind }, { onOpen, onRename, onCopy, onDelete, onExport }) {
  const filteredMaps = maps.filter(map => matchesKind(map, kind) && matchesFilter(map, year, month));
  const list = container.querySelector("#mapsList");

  if (!list) return;

  if (!filteredMaps.length) {
    list.innerHTML = `
      <div class="screen-card empty-state">
        ${gardenBloom()}
        <h3 data-i18n>No maps found</h3>
        <p data-i18n>Try a different month or year, or create a new map.</p>
      </div>
    `;
    return;
  }

  list.innerHTML = filteredMaps.map(map => renderMapCard(map, activeMapId)).join("");

  list.querySelectorAll(".map-more-menu").forEach(menu => bindMoreMenu(menu, list));

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

  list.querySelectorAll("[data-map-copy-id]").forEach(button => {
    button.addEventListener("click", () => {
      const mapId = button.dataset.mapCopyId;
      const map = filteredMaps.find(item => item.id === mapId);
      if (!map) return;
      const suggestedName = `${map.name || t("Untitled map")} (${t("copy")})`.slice(0, MAP_NAME_MAX_LENGTH);

      openMapDialog({
        title: 'Copy map', submitLabel: 'Create copy', closeOnNavigation: true,
        body: `<label>${escapeHtml(t('Map name'))}<input name="mapName" type="text" required maxlength="${MAP_NAME_MAX_LENGTH}" value="${escapeHtml(suggestedName)}" autofocus></label>`,
        onSubmit: dialog => {
          const name = dialog.querySelector('input').value.trim();
          if (!name) return;
          if (onCopy?.(mapId, name) !== false) dialog.close();
        },
      });
    });
  });

  list.querySelectorAll("[data-map-delete-id]").forEach(button => {
    button.addEventListener("click", () => onDelete?.(button.dataset.mapDeleteId));
  });
}

export function renderMyMapsView(container, { maps, activeMapId, onCreate, onImport, onOpen, onRename, onCopy, onDelete, onExport }) {
  const mapMeta = maps.map(buildMapMeta);
  const allYears = [...new Set(mapMeta.flatMap(map => map.years))].sort();

  container.innerHTML = `
    <section class="screen" aria-label="My maps" data-i18n-aria-label="My maps">
      <div class="screen-shell">
        <div class="screen-hero">
          ${gardenSprig()}
          <h2 data-i18n>Saved cycle maps</h2>
          <p data-i18n>Export maps or import a shared map.</p>
        </div>

        <div class="screen-card map-filter-card">
          <div class="map-filters">
            <label>
              <span class="input-label" data-i18n>Show</span>
              <select id="mapsKindFilter">
                ${Object.entries(MAP_KINDS).map(([value, label]) => `<option value="${value}" data-i18n>${escapeHtml(label)}</option>`).join("")}
              </select>
            </label>
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
            <button type="button" class="btn secondary map-import-btn" id="myMapsImportBtn" data-i18n>Import map</button>
            <button type="button" class="btn primary map-create-plus" id="myMapsCreateBtn"><span aria-hidden="true">＋</span><span data-i18n>Create map</span></button>
            <input class="visually-hidden" id="myMapsImportFile" type="file" accept="application/json,.json,application/pdf,.pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,.xlsx" tabindex="-1">
          </div>
        </div>

        <div id="mapsList" class="maps-list"></div>
      </div>
    </section>
  `;

  const kindFilter = container.querySelector("#mapsKindFilter");
  const yearFilter = container.querySelector("#mapsYearFilter");
  const monthFilter = container.querySelector("#mapsMonthFilter");

  const refresh = () => {
    const filters = { kind: kindFilter?.value ?? "", year: yearFilter?.value ?? "", month: monthFilter?.value ?? "" };
    renderMapList(container, mapMeta, activeMapId, filters, { onOpen, onRename, onCopy, onDelete, onExport });
  };

  kindFilter?.addEventListener("change", refresh);
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
