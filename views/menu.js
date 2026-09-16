import { escapeHtml } from "./view-utils.js";

const MENU_ITEMS = [
  {
    screen: "my-profile",
    title: "My Profile",
    description: "Review or edit your profile.",
  },
  {
    screen: "my-maps",
    title: "My Maps",
    description: "Browse saved cycle map.",
  },
  {
    screen: "create-map",
    title: "Create Map",
    description: "Start a new empty cycle map.",
  },
  {
    screen: "active-map",
    title: "Active Map",
    description: "Continue editing the currently active map.",
  },
];

export function renderMenuView(container, { activeMap, onNavigate }) {
  const activeMapName = activeMap?.name?.trim() || "No active map yet";
  const activeMapHint = activeMap ? "Your active map you're working on." : "Create a map first to see it here.";

  container.innerHTML = `
    <section class="screen screen-menu" aria-label="Main menu" data-i18n-aria-label="Main menu">
      <div class="screen-shell">
        <div class="screen-hero">
          <p class="screen-kicker" data-i18n>Main Menu</p>
          <h2 data-i18n>Start making maps</h2>
          <p data-i18n>To create a map, go to the create map menu.</p>
        </div>

        <button type="button" class="screen-card menu-summary-card" data-screen="active-map" ${activeMap ? "" : "disabled"}>
          <div>
            <div class="menu-summary-label" data-i18n>Active map</div>
            <div class="menu-summary-value" ${activeMap?.name?.trim() ? "" : "data-i18n"}>${escapeHtml(activeMapName)}</div>
          </div>
          <div class="menu-summary-note"> <span data-i18n>${escapeHtml(activeMapHint)}</span></div>
        </button>

        <div class="menu-grid">
          ${MENU_ITEMS.map(item => {
            const disabled = item.screen === "active-map" && !activeMap;
            return `
              <button
                type="button"
                class="screen-card menu-card${disabled ? " is-disabled" : ""}"
                data-screen="${item.screen}"
                ${disabled ? "disabled" : ""}
              >
                <span class="menu-card-index">${MENU_ITEMS.indexOf(item) + 1}</span>
                <span class="menu-card-title"> <span data-i18n>${escapeHtml(item.title)}</span></span>
                <span class="menu-card-description"> <span data-i18n>${escapeHtml(item.description)}</span></span>
              </button>
            `;
          }).join("")}
        </div>
      </div>
    </section>
  `;

  container.querySelectorAll("[data-screen]").forEach(button => {
    button.addEventListener("click", () => onNavigate?.(button.dataset.screen));
  });
}
