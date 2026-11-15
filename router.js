import { MAP_NAME_MAX_LENGTH } from './form-limits.js';
import { ISO_DATE_KEY_LENGTH } from './date-utils.js';
import { store } from "./store.js";
import { t } from "./i18n.js";
import { renderMenuView } from "./views/menu.js";
import { renderProfileScreen } from "./views/profile.js";
import { renderMyMapsView } from "./views/my-maps.js";
import { openMapDialog } from "./ui/map-dialog.js";
import { enhanceTimeInputs } from "./ui/time-picker.js";
import { readMapSettings, renderMapSettingsFields } from "./views/map-settings-fields.js";
import { closeExportMenu } from './ui/export-menu.js';
import { escapeHtml } from "./views/view-utils.js";
import { createNavigation } from "./navigation.js";
import { downloadFile } from './browser-download.js';
import { exportMap, readMapImport } from './map-transfer.js';

const BACKUP_URL_LIFETIME_MS = 0;

export const MODAL_ROUTES = Object.freeze({
  actionModal: "edit-day", modal: "temperature", bleedingModal: "bleeding",
  mucusModal: "mucus", cervixModal: "cervix", otherModal: "other",
  markersModal: "markers", fertileRangeModal: "fertile-range", dayInfoModal: "day-info",
});

export function createRouter({ root, showStandaloneScreen, openActiveMap, openMapPage, showMessage, auth, preferActiveMapOnResume, browser = window }) {
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
  const back = () => navigation.back("home");

  function normalizeRoute(input) {
    let screen = typeof input === "string" ? input : input.screen;
    const params = new URLSearchParams(typeof input === "string" ? "" : input.params);
    if (!store.hasProfile()) return { screen: "profile-setup", params: new URLSearchParams() };
    if (!screen || ["home", "sign-in", "sign-up", "verify-email", "resend-code", "forgot-password", "reset-password"].includes(screen)) screen = store.getActiveMapId() ? "active-map" : "my-maps";
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
          subtitle: "Create your profile to get started.",
          profile: store.getProfile(),
          submitLabel: "Save and continue",
          showCancel: false,
          onSave: profile => {
            if (!runStoreAction(() => store.saveProfile(profile)).ok) return;
            showMessage?.("Profile saved ✓");
            navigate("home", { replace: true });
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
          subtitle: "Manage your name, consultant and profile photo.",
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
            let importedState;
            try {
              importedState = await readMapImport(file);
            } catch (error) {
              showMessage?.(error.message || "The map backup could not be read.");
              return;
            }

            if (!confirm(t("Import this shared map? It will be added to My Maps without changing your profile or existing maps."))) return;

            try {
              const importedMap = store.importMapState(importedState);
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
          onCopy: (mapId, name) => {
            const result = runStoreAction(() => store.duplicateMap(mapId, name));
            if (!result.ok || !result.value) return false;
            showMessage?.("Map copied ✓");
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
              const { contents, mimeType, filename } = await exportMap(map, format, {
                accountProfile: store.getProfile(), active: store.getActiveMapId() === mapId,
              });
              downloadFile(contents, mimeType, filename, format === 'json' ? { urlLifetimeMs: BACKUP_URL_LIFETIME_MS } : undefined);
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
          body: `<label>${escapeHtml(t('Map name'))}<input name="mapName" type="text" required maxlength="${MAP_NAME_MAX_LENGTH}" autofocus></label>
            ${renderMapSettingsFields(store.lastMapSettings())}`,
          onClose: () => {
            if (createMapDialog !== dialog) return;
            createMapDialog = null;
            if (navigation.current?.screen === 'create-map') navigation.back(background);
          },
          onSubmit: dialog => {
            const name = dialog.querySelector('input').value.trim();
            if (!name) return;
            const result = runStoreAction(() => store.createMap(name, readMapSettings(dialog)));
            if (!result.ok) return;
            showMessage?.("Map created ✓");
            navigate("active-map", { replace: true });
          },
        });
        enhanceTimeInputs(createMapDialog);
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

  function modalRoute(modalId) {
    const params = new URLSearchParams({ map: store.getActiveMapId(), page: MODAL_ROUTES[modalId] });
    if (store.selectedKey) params.set("day", store.selectedKey);
    if (store.selectedPointType === "adjusted") params.set("point", "adjusted");
    return { screen: "active-map", params };
  }

  // Phones reopen on the active map. A restored list screen is replaced on any launch;
  // Profile is replaced only on a reload, because a fresh load of it can be a direct link.
  const RESUMABLE_SCREENS = Object.freeze({ own: ["menu", "my-maps", "my-profile"], fresh: ["menu", "my-maps"] });

  function start() {
    navigation.start({
      resume: ({ screen }, { ownEntry }) => preferActiveMapOnResume?.()
        && store.getActiveMapId()
        && RESUMABLE_SCREENS[ownEntry ? "own" : "fresh"].includes(screen) ? "home" : null,
    });
  }

  return {
    navigate,
    back,
    start,
    modalOpened(modalId) {
      if (rendering || !MODAL_ROUTES[modalId]) return;
      navigate(modalRoute(modalId), { silent: true });
    },
    modalRouteChanged(modalId) {
      if (rendering || !MODAL_ROUTES[modalId]) return;
      navigate(modalRoute(modalId), { silent: true, replace: true });
    },
    modalClosed() {
      if (!rendering) navigation.back("active-map");
    },
    get currentScreen() {
      return navigation.current?.screen;
    },
  };
}
