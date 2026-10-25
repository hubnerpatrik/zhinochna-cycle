import { MAP_NAME_MAX_LENGTH } from './form-limits.js';
import { ISO_DATE_KEY_LENGTH } from './date-utils.js';
import { store } from "./store.js";
import { t } from "./i18n.js";
import { renderMenuView } from "./views/menu.js";
import { renderProfileScreen } from "./views/profile.js";
import { renderMyMapsView } from "./views/my-maps.js";
import { openMapDialog } from "./ui/map-dialog.js";
import { closeExportMenu } from './ui/export-menu.js';
import { escapeHtml } from "./views/view-utils.js";
import { backupFilename } from "./backup.js";
import { createNavigation } from "./navigation.js";
import { downloadFile, exportFilename, mapCsv, mapPdf, mapXlsx } from './map-export.js';

const BACKUP_URL_LIFETIME_MS = 0;

export const MODAL_ROUTES = Object.freeze({
  actionModal: "edit-day", modal: "temperature", bleedingModal: "bleeding",
  mucusModal: "mucus", cervixModal: "cervix", otherModal: "other",
  markersModal: "markers", fertileRangeModal: "fertile-range", dayInfoModal: "day-info",
});

function downloadBackup(contents, mapName) {
  downloadFile(contents, 'application/json', backupFilename(new Date(), mapName), {
    urlLifetimeMs: BACKUP_URL_LIFETIME_MS,
  });
}

export function createRouter({ root, showStandaloneScreen, openActiveMap, openMapPage, showMessage, browser = window }) {
  let rendering = false;
  let createMapDialog = null;

  const navByScreen = {
    menu: "navMenuBtn",
    "my-profile": "navProfileBtn",
    "my-maps": "navMapsBtn",
    "create-map": "navCreateMapBtn",
    "active-map": "navActiveMapBtn",
  };

  function runStoreAction(action, failureMessage = "Changes could not be saved. Please try again.") {
    try {
      return { ok: true, value: action() };
    } catch {
      showMessage?.(failureMessage);
      return { ok: false, value: null };
    }
  }

  function syncHeaderNavigation(screen) {
    const nav = document.getElementById("headerNav");
    if (!nav) return;

    nav.classList.toggle("hidden", screen === "profile-setup");

    Object.entries(navByScreen).forEach(([route, id]) => {
      const button = document.getElementById(id);
      if (!button) return;
      button.classList.toggle("is-active", route === screen);
      button.setAttribute("aria-current", route === screen ? "page" : "false");
    });

    const activeMapButton = document.getElementById("navActiveMapBtn");
    if (activeMapButton) {
      activeMapButton.disabled = !store.getActiveMapId();
    }
  }

  const navigation = createNavigation({ browser, normalize: normalizeRoute, render: renderRoute });
  const navigate = (screen, options) => navigation.navigate(screen, options);
  const back = () => navigation.back("menu");

  function normalizeRoute(input) {
    let screen = typeof input === "string" ? input : input.screen;
    const params = new URLSearchParams(typeof input === "string" ? "" : input.params);
    if (!store.hasProfile()) return { screen: "profile-setup", params: new URLSearchParams() };
    if (!Object.hasOwn(navByScreen, screen)) screen = "menu";
    if (screen === 'create-map') {
      const from = params.get('from');
      const background = ['menu', 'my-maps'].includes(from) ? from
        : navigation.current?.screen === 'menu' ? 'menu' : 'my-maps';
      return { screen, params: new URLSearchParams({ from: background }) };
    }
    if (screen !== "active-map") return { screen, params: new URLSearchParams() };
    const mapId = params.get("map") || store.getActiveMapId();
    if (!mapId || !store.getMap(mapId)) return { screen: "my-maps", params: new URLSearchParams() };
    if (mapId !== store.getActiveMapId()) {
      if (!runStoreAction(() => store.setActiveMapId(mapId)).ok) {
        return { screen: "my-maps", params: new URLSearchParams() };
      }
    }
    const clean = new URLSearchParams({ map: mapId });
    const page = params.get("page");
    const day = params.get("day");
    const date = day && new Date(`${day}T12:00:00Z`);
    const validDay = /^\d{4}-\d{2}-\d{2}$/.test(day || "")
      && Number.isFinite(date?.getTime()) && date.toISOString().slice(0, ISO_DATE_KEY_LENGTH) === day;
    if (Object.values(MODAL_ROUTES).includes(page)
      && (["edit-day", "fertile-range"].includes(page) || validDay)) {
      clean.set("page", page);
      if (validDay) clean.set("day", day);
      if (params.get("point") === "adjusted") clean.set("point", "adjusted");
    }
    return { screen, params: clean };
  }

  function renderRoute(route) {
    rendering = true;
    try {
      // The dialog lives outside root, so replacing the page cannot dismiss it.
      const previousDialog = createMapDialog;
      createMapDialog = null;
      previousDialog?.remove();
      closeExportMenu();
      if (route.screen === "active-map" && route.params.has("page")) {
        store.selectedKey = route.params.get("day");
        store.selectedPointType = route.params.get("point") || "temp";
      }
      render(route.screen);
      if (route.screen === "active-map" && route.params.has("page")) {
        openMapPage?.(route.params.get("page"));
      }
    } finally {
      rendering = false;
    }
  }

  function render(screen) {
    syncHeaderNavigation(screen);

    if (screen !== "active-map") {
      showStandaloneScreen();
    }

    switch (screen) {
      case "profile-setup":
        renderProfileScreen(root, {
          title: "Profile Setup",
          subtitle: "Create your profile before opening the main menu.",
          profile: store.getProfile(),
          submitLabel: "Save and continue",
          showCancel: false,
          onSave: profile => {
            if (!runStoreAction(() => store.saveProfile(profile)).ok) return;
            showMessage?.("Profile saved ✓");
            navigate("menu", { replace: true });
          },
        });
        break;

      case "menu":
        renderMenuView(root, {
          activeMap: store.getMap(store.getActiveMapId()),
          onNavigate: navigate,
        });
        break;

      case "my-profile":
        renderProfileScreen(root, {
          title: "My Profile",
          subtitle: "Manage your personal details, measurement preferences and profile photo.",
          profile: store.getProfile(),
          submitLabel: "Save profile",
          showCancel: true,
          onCancel: back,
          onSave: profile => {
            if (!runStoreAction(() => store.saveProfile(profile)).ok) return;
            showMessage?.("Profile saved ✓");
            back();
          },
        });
        break;

      case "my-maps":
        renderMyMapsView(root, {
          maps: store.listMaps(),
          activeMapId: store.getActiveMapId(),
          onCreate: () => navigate("create-map"),
          onImport: async file => {
            let contents;
            try {
              contents = await file.text();
            } catch {
              showMessage?.("The map backup could not be read.");
              return;
            }

            try {
              store.validateMapBackup(contents);
            } catch (error) {
              showMessage?.(error.message || "The map backup is invalid.");
              return;
            }

            if (!confirm(t("Import this shared map? It will be added to My Maps without changing your profile or existing maps."))) return;

            try {
              const importedMap = store.importMapBackup(contents);
              showMessage?.(`“${importedMap.name || "Untitled map"}” imported ✓`);
              navigate("my-maps");
            } catch (error) {
              showMessage?.(error.message || "Import failed. Your existing data was preserved.");
            }
          },
          onRename: (mapId, name) => {
            const result = runStoreAction(() => store.renameMap(mapId, name));
            if (!result.ok) return false;
            const renamed = result.value;
            if (!renamed) {
              showMessage?.("Map name cannot be empty");
              return false;
            }
            showMessage?.("Map renamed ✓");
            navigate("my-maps");
            return true;
          },
          onDelete: mapId => {
            const result = runStoreAction(() => store.deleteMap(mapId));
            if (!result.ok || !result.value) return;
            showMessage?.("Map deleted");
            navigate("my-maps");
          },
          onExport: async (mapId, format = 'json') => {
            try {
              const map = store.getMap(mapId);
              if (!map) throw new Error("Map not found");
              if (format === 'csv') downloadFile(mapCsv(map), 'text/csv;charset=utf-8', exportFilename(map.name, 'csv'));
              else if (format === 'xlsx') downloadFile(mapXlsx(map), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', exportFilename(map.name, 'xlsx'));
              else if (format === 'pdf') downloadFile(await mapPdf(map), 'application/pdf', exportFilename(map.name, 'pdf'));
              else downloadBackup(store.createMapBackup(mapId), map.name);
              showMessage?.(`“${map.name || "Untitled map"}” exported ✓`);
            } catch {
              showMessage?.("Map export failed. Your data was not changed.");
            }
          },
          onOpen: mapId => {
            const result = runStoreAction(() => store.setActiveMapId(mapId));
            if (!result.ok || !result.value) return;
            navigate("active-map");
          },
        });
        break;

      case "create-map": {
        const background = navigation.current.params.get('from') || 'my-maps';
        render(background);
        createMapDialog = openMapDialog({ title: 'Create map', submitLabel: 'Create',
          body: `<label>${escapeHtml(t('Map name'))}<input name="mapName" type="text" required maxlength="${MAP_NAME_MAX_LENGTH}" autofocus></label>`,
          onClose: () => {
            if (createMapDialog !== dialog) return;
            createMapDialog = null;
            if (navigation.current?.screen === 'create-map') navigation.back(background);
          },
          onSubmit: dialog => {
            const name = dialog.querySelector('input').value.trim();
            if (!name) return;
            const result = runStoreAction(() => store.createMap(name));
            if (!result.ok) return;
            showMessage?.("Map created ✓");
            navigate("active-map", { replace: true });
          },
        });
        // Ignore delayed close events from dialogs dismissed by navigation.
        const dialog = createMapDialog;
        break;
      }

      case "active-map":
        openActiveMap(store.getActiveMapId());
        break;

      default:
        navigate(store.hasProfile() ? "menu" : "profile-setup");
        break;
    }
  }

  function start() {
    navigation.start();
  }

  return {
    navigate,
    back,
    start,
    modalOpened(modalId) {
      if (rendering || !MODAL_ROUTES[modalId]) return;
      const params = new URLSearchParams({ map: store.getActiveMapId(), page: MODAL_ROUTES[modalId] });
      if (store.selectedKey) params.set("day", store.selectedKey);
      if (store.selectedPointType === "adjusted") params.set("point", "adjusted");
      navigate({ screen: "active-map", params }, { silent: true });
    },
    modalClosed() {
      if (!rendering) navigation.back("active-map");
    },
    get currentScreen() {
      return navigation.current?.screen;
    },
  };
}
