import { escapeHtml } from "./view-utils.js";
import { currentRelease } from '../release-notes.js';

const MENU_ITEMS = [
  {
    screen: "my-profile",
    icon: "profile",
    title: "My Profile",
  },
  {
    screen: "my-maps",
    icon: "maps",
    title: "My Maps",
  },
  {
    screen: "create-map",
    icon: "create",
    title: "Create Map",
  },
  {
    screen: "active-map",
    icon: "chart",
    title: "Active Map",
  },
];

export function renderMenuView(container, { activeMap, onNavigate }) {
  const activeMapName = activeMap?.name?.trim() || "No active map yet";

  container.innerHTML = `
    <section class="screen screen-menu" aria-label="Main menu" data-i18n-aria-label="Main menu">
      <div class="screen-shell">
        <div class="screen-hero">
          <p class="screen-kicker" data-i18n>Main Menu</p>
          <h2 data-i18n>Start making maps</h2>
          <p data-i18n>Create a map in My Maps, or continue with your active map.</p>
        </div>

        <button type="button" class="screen-card menu-summary-card" data-screen="active-map" ${activeMap ? "" : "disabled"}>
          <div>
            <div class="menu-summary-label" data-i18n>Active map</div>
            <div class="menu-summary-value" ${activeMap?.name?.trim() ? "" : "data-i18n"}>${escapeHtml(activeMapName)}</div>
          </div>
        </button>

        <div class="menu-grid">
          ${MENU_ITEMS.map((item, index) => {
            const disabled = item.screen === "active-map" && !activeMap;
            return `
              <button
                type="button"
                class="screen-card menu-card${disabled ? " is-disabled" : ""}"
                data-screen="${item.screen}"
                ${disabled ? "disabled" : ""}
              >
                <span class="menu-card-index">${index + 1}</span>
                <span class="menu-card-icon" aria-hidden="true"><svg><use href="/icons.svg#nav-${item.icon}"/></svg></span>
                <span class="menu-card-title"> <span data-i18n>${escapeHtml(item.title)}</span></span>
              </button>
            `;
          }).join("")}
        </div>
        <footer class="menu-footer"><span>v${escapeHtml(currentRelease.version)}</span><a class="menu-changelog" href="${escapeHtml(currentRelease.githubUrl)}" target="_blank" rel="noopener noreferrer">Changelog <span aria-hidden="true">↗</span></a></footer>
      </div>
    </section>
  `;

  container.querySelectorAll("[data-screen]").forEach(button => {
    button.addEventListener("click", () => onNavigate?.(button.dataset.screen));
  });
}
