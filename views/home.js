import { escapeHtml } from "./view-utils.js";

// Home page: a gerbera meadow that introduces the app. Signed-in users see it as the menu screen;
// signed-out visitors see it before the sign-in form. The flowers are decoration and carry no data.

const FEATURES = [
  { demo: "calendar", title: "Record a day in a few taps", text: "Temperature, bleeding, mucus, cervix and other signs, one day at a time." },
  { demo: "chart", title: "See the whole cycle", text: "A calendar and a temperature chart on one map. You decide what it means." },
  { demo: "export", title: "Keep your data", text: "Export to PDF, XLSX or JSON and import it back whenever you need." },
];

const COMING_SOON = [
  { title: "Who makes Cycle Tracker", text: "Meet the person behind the app." },
  { title: "Why it exists", text: "How the app came to be and what it is for." },
  { title: "Step-by-step guide", text: "An article on recording your first cycle." },
  { title: "Courses", text: "Where to learn symptothermal observation." },
];

const TONES = ["peach", "rose", "butter", "lavender", "white"];

// Three rows from the far hill to the near one: [y of the flower head, scale, horizontal step, stem stroke].
const ROWS = [
  { y: 150, scale: 0.62, step: 58, stem: 1.6, sway: "slow" },
  { y: 252, scale: 1.1, step: 96, stem: 2.2, sway: "mid" },
  { y: 372, scale: 1.9, step: 165, stem: 3.2, sway: "near" },
];

const HILLS = [
  "M0 150C200 112 420 162 600 136C800 110 1000 152 1200 122V480H0Z",
  "M0 254C220 218 430 268 640 242C850 216 1020 258 1200 232V480H0Z",
  "M0 368C200 336 420 380 640 356C860 330 1040 370 1200 350V480H0Z",
];

// Small deterministic jitter so the field looks sown by hand but renders the same every time.
function jitter(seed) {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

function gerberaSymbol(id) {
  const petals = Array.from({ length: 18 }, (_, i) => `<ellipse cx="0" cy="-15" rx="3.1" ry="11" transform="rotate(${i * 20})"/>`).join("");
  const inner = Array.from({ length: 12 }, (_, i) => `<ellipse cx="0" cy="-9" rx="2" ry="5.5" transform="rotate(${i * 30 + 15})"/>`).join("");
  return `<g id="${id}"><g class="gerbera-petals">${petals}</g><g class="gerbera-inner">${inner}</g><circle class="gerbera-disc" r="6.5"/><circle class="gerbera-eye" r="3.4"/></g>`;
}

function flower(symbolId, x, y, scale, row, index) {
  const tone = TONES[(index * 3 + Math.round(x)) % TONES.length];
  const lean = (jitter(x + y) - 0.5) * 30;
  const leaf = row.sway === "near"
    ? `<path class="gerbera-leaf" d="M${x + lean * 0.4} ${y + 70} c-22 -6 -34 -20 -34 -32 c18 2 30 14 34 32z"/>`
    : "";
  return `<g class="gerbera sway-${row.sway} sway-${index % 3}">`
    + `<path class="gerbera-stem" stroke-width="${row.stem}" d="M${x} 474C${x + lean} ${(y + 474) / 2} ${x + lean} ${y + 30} ${x} ${y}"/>`
    + leaf
    + `<use href="#${symbolId}" class="tone-${tone}" transform="translate(${x} ${y}) scale(${scale})"/></g>`;
}

export function meadowSvg(idPrefix) {
  const symbolId = `${idPrefix}-gerbera`;
  let index = 0;
  const layers = ROWS.map((row, rowIndex) => {
    const flowers = [];
    for (let x = row.step * 0.35; x < 1200; x += row.step) {
      const fx = x + (jitter(x + rowIndex * 7) - 0.5) * row.step * 0.8;
      const fy = row.y + (jitter(fx + 3) - 0.5) * row.step * 0.42;
      const scale = row.scale * (0.8 + jitter(fx * 1.7 + rowIndex) * 0.4);
      flowers.push(flower(symbolId, Math.round(fx), Math.round(fy), Math.round(scale * 100) / 100, row, index++));
    }
    return `<path class="home-hill home-hill-${rowIndex + 1}" d="${HILLS[rowIndex]}"/><g class="home-row home-row-${rowIndex + 1}">${flowers.join("")}</g>`;
  }).join("");
  // The near edge of the meadow turns into the garden ground the sections stand on.
  const edge = `<path class="home-hill home-hill-edge" d="M0 456C220 440 440 466 660 452C880 438 1040 462 1200 448V480H0Z"/>`;
  return `<svg class="home-meadow" viewBox="0 0 1200 480" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">`
    + `<defs>${gerberaSymbol(symbolId)}</defs><circle class="home-sun" cx="1010" cy="96" r="40"/>${layers}${edge}</svg>`;
}

function demo(kind) {
  if (kind === "calendar") {
    const days = Array.from({ length: 14 }, (_, i) => {
      const state = i < 3 ? " is-period" : i === 9 ? " is-selected" : "";
      return `<span class="home-demo-day${state}">${i + 1}</span>`;
    }).join("");
    return `<div class="home-demo home-demo-calendar" aria-hidden="true">${days}</div>`;
  }
  if (kind === "chart") {
    const points = [36.35, 36.4, 36.3, 36.45, 36.35, 36.4, 36.5, 36.45, 36.75, 36.8, 36.85, 36.8, 36.9, 36.85];
    const coords = points.map((value, i) => `${8 + i * 17},${70 - (value - 36.2) * 70}`).join(" ");
    const dots = coords.split(" ").map(point => {
      const [cx, cy] = point.split(",");
      return `<circle cx="${cx}" cy="${cy}" r="2.6"/>`;
    }).join("");
    return `<svg class="home-demo home-demo-chart" viewBox="0 0 238 80" aria-hidden="true" focusable="false">`
      + `<path class="home-demo-grid" d="M0 20H238M0 40H238M0 60H238"/><polyline points="${coords}"/>${dots}</svg>`;
  }
  return `<div class="home-demo home-demo-export" aria-hidden="true"><span>PDF</span><span>XLSX</span><span>JSON</span></div>`;
}

// The same flag picker as the app header; views/welcome.js mounts it.
const LANGUAGE_PICKER = '<details class="language-picker"></details>';

const BRAND_FLOWER = `<svg class="home-brand-mark" viewBox="0 0 32 32" aria-hidden="true" focusable="false"><g class="bloom-petals">${
  [0, 72, 144, 216, 288].map(angle => `<ellipse cx="16" cy="9.2" rx="4.4" ry="6" transform="rotate(${angle} 16 16)"/>`).join("")
}</g><circle class="bloom-heart" cx="16" cy="16" r="3.4"/></svg>`;

export function homeMarkup({ variant = "member", version = "", changelogUrl = "" } = {}) {
  const isPublic = variant === "public";
  const topBar = isPublic ? `
    <div class="home-topbar">
      <span class="home-brand">${BRAND_FLOWER}<span>Cycle Tracker</span></span>
      <div class="home-topbar-actions">${LANGUAGE_PICKER}<button type="button" class="home-pill" data-auth-mode="sign-in" data-i18n>Sign in</button></div>
    </div>` : "";
  const actions = isPublic ? `
        <div class="home-actions">
          <button type="button" class="home-cta" data-auth-mode="sign-in" data-i18n>Sign in</button>
          <button type="button" class="home-link" data-auth-mode="sign-up" data-i18n>Create account</button>
        </div>` : "";
  const changelog = changelogUrl
    ? `<a class="home-changelog" href="${escapeHtml(changelogUrl)}" target="_blank" rel="noopener noreferrer"><span data-i18n>Changelog</span><svg class="home-changelog-icon" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M5 11 11 5M6 5h5v5"/></svg></a>`
    : "";

  return `
    <section class="screen screen-menu screen-home home-${isPublic ? "public" : "member"}" aria-labelledby="homeTitle-${variant}">
      <div class="home">
        <div class="home-hero">${topBar}
          <div class="home-hero-copy">
            <h1 id="homeTitle-${variant}" data-i18n>${isPublic ? "Record your cycle, day by day." : "Welcome back."}</h1>
            <p class="home-lede" data-i18n>${isPublic
    ? "Temperature, observations and a clear cycle map. Calm, simple and yours to interpret."
    : "Record today in Active Map. Here you will find what the app can do and what is coming next."}</p>${actions}
          </div>
          ${meadowSvg(`home-${variant}`)}
        </div>

        <div class="home-garden">
          <section class="home-features" aria-labelledby="homeFeatures-${variant}">
            <h2 id="homeFeatures-${variant}" data-i18n>What the app does</h2>
            <ul class="home-signs">
              ${FEATURES.map((item, i) => `
              <li class="home-sign">
                ${demo(item.demo)}
                <h3 data-i18n>${escapeHtml(item.title)}</h3>
                <p data-i18n>${escapeHtml(item.text)}</p>
                <svg class="home-sign-foot tuft-${i % 3}" viewBox="0 0 120 28" aria-hidden="true" focusable="false"><path d="M6 28Q3 23 4 18M12 28Q9 19 10 10M18 28Q17 21 20 14M26 28Q23 17 24 6M33 28Q33 21.5 37 15M40 28Q38 18.5 40 9M47 28Q47 22.5 51 17M55 28Q52.5 16 54 4M62 28Q62 20.5 66 13M70 28Q67.5 18 69 8M77 28Q77 22 81 16M85 28Q82.5 16.5 84 5M92 28Q92 21 96 14M100 28Q97.5 18.5 99 9M107 28Q107 23 111 18M114 28Q111.5 19.5 113 11"/><circle class="home-sign-bud" cx="24" cy="6" r="3.2"/><circle class="home-sign-bud" cx="84" cy="5" r="2.8"/><circle class="home-sign-bud" cx="54" cy="4" r="2.4"/></svg>
              </li>`).join("")}
            </ul>
          </section>

          <section class="home-soon" aria-labelledby="homeSoon-${variant}">
            <h2 id="homeSoon-${variant}" data-i18n>Coming soon</h2>
            <ul class="home-signs home-signs-soon">
              ${COMING_SOON.map((item, i) => `
              <li class="home-sign home-sign-soon">
                <h3 data-i18n>${escapeHtml(item.title)}</h3>
                <p data-i18n>${escapeHtml(item.text)}</p>
                <span class="home-soon-tag" data-i18n>Soon</span>
                <svg class="home-sign-foot tuft-${i % 3}" viewBox="0 0 120 28" aria-hidden="true" focusable="false"><path d="M6 28Q3 23 4 18M12 28Q9 19 10 10M18 28Q17 21 20 14M26 28Q23 17 24 6M33 28Q33 21.5 37 15M40 28Q38 18.5 40 9M47 28Q47 22.5 51 17M55 28Q52.5 16 54 4M62 28Q62 20.5 66 13M70 28Q67.5 18 69 8M77 28Q77 22 81 16M85 28Q82.5 16.5 84 5M92 28Q92 21 96 14M100 28Q97.5 18.5 99 9M107 28Q107 23 111 18M114 28Q111.5 19.5 113 11"/><circle class="home-sign-bud" cx="24" cy="6" r="3.2"/><circle class="home-sign-bud" cx="84" cy="5" r="2.8"/><circle class="home-sign-bud" cx="54" cy="4" r="2.4"/></svg>
              </li>`).join("")}
            </ul>
          </section>

          <footer class="home-footer">
            <p data-i18n>Cycle Tracker is an educational tool for recording your own observations. It does not give medical advice.</p>
            <div class="home-footer-meta"><span>v${escapeHtml(version)}</span>${changelog}</div>
          </footer>
        </div>
      </div>
    </section>`;
}
