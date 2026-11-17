import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const STYLES = new URL('../styles/', import.meta.url);
const read = name => readFileSync(new URL(name, STYLES), 'utf8');

function luminance(hex) {
  const channels = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

function token(css, name) {
  return css.match(new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6})\\b`))?.[1];
}

// Bodies of every rule whose selector list contains `selector` (rules nested in @media included).
function rules(css, selector) {
  const wanted = selector.replace(/\s+/g, ' ').trim();
  return [...css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter(([, selectors]) => selectors.split(',').some(part => part.replace(/\s+/g, ' ').trim() === wanted))
    .map(([, , body]) => body);
}

test('tokens.css is imported before every other stylesheet', () => {
  const imports = [...read('index.css').matchAll(/@import url\(["']?([^"')]+)/g)].map(m => m[1]);
  assert.match(imports[0], /tokens\.css$/);
});

test('the action colour carries readable labels and stands out from the page', () => {
  const css = read('tokens.css');
  const action = token(css, '--action');
  const ink = token(css, '--action-ink');
  const bg = token(css, '--bg');
  assert.ok(action && ink && bg, 'tokens.css defines --action, --action-ink and --bg as hex colours');
  assert.ok(contrast(action, ink) >= 4.5, `label on --action is ${contrast(action, ink).toFixed(2)}:1`);
  assert.ok(contrast(action, bg) >= 3, `--action on --bg is ${contrast(action, bg).toFixed(2)}:1`);
});

// Resolves `--name: #hex` or `--name: var(--other)` to a hex value.
function resolved(css, name) {
  const value = css.match(new RegExp(`${name}:\\s*([^;]+);`))?.[1].trim();
  const alias = value?.match(/^var\((--[\w-]+)\)$/)?.[1];
  return alias ? resolved(css, alias) : value;
}

test('the pastel action fill carries a dark label that stays readable at rest and on hover', () => {
  const css = read('tokens.css');
  const ink = resolved(css, '--action-fill-ink');
  for (const name of ['--action-fill', '--action-fill-hover']) {
    const fill = resolved(css, name);
    assert.match(fill || '', /^#[0-9a-fA-F]{6}$/, `${name} is a hex colour`);
    assert.ok(contrast(fill, ink) >= 4.5, `label on ${name} is ${contrast(fill, ink).toFixed(2)}:1`);
  }
});

test('primary buttons use the pastel fill with a dark label; the strong accent stays for thin marks', () => {
  const css = allCss();
  for (const selector of ['.btn.primary', '#mobileDayBtn', '#mobileSaveBtn', '.time-picker-done', '.tool-btn.active']) {
    const bodies = rules(css, selector).filter(body => /background/.test(body));
    assert.ok(bodies.length, `${selector} sets a background`);
    for (const body of bodies) {
      assert.match(body, /background\s*:\s*var\(--action-fill(?:-hover)?\)/, `${selector} uses --action-fill`);
      assert.doesNotMatch(body, /var\(--action-ink\)/, `${selector} still uses the white label`);
    }
  }
});

test('primary actions are one flat action colour, not a gradient', () => {
  const all = readdirSync(STYLES).filter(name => name.endsWith('.css')).map(read).join('\n');
  for (const selector of ['.btn.primary', '#mobileDayBtn', '#mobileSaveBtn', '.time-picker-done', '.tool-btn.active']) {
    const bodies = rules(all, selector);
    assert.ok(bodies.length, `${selector} has a rule`);
    for (const body of bodies) assert.doesNotMatch(body, /gradient\(/, `${selector} uses a gradient`);
  }
});

const allCss = () => readdirSync(STYLES).filter(name => name.endsWith('.css')).map(read).join('\n');

test('secondary actions share one flat recipe built from tokens', () => {
  const css = allCss();
  for (const selector of ['.btn.secondary', '.btn.map-import-btn', '.btn.map-export-btn', '#mobileProfileBtn', '#mobileSummaryBtn', '.mobile-profile-actions button']) {
    for (const body of rules(css, selector)) {
      assert.doesNotMatch(body, /gradient\(/, `${selector} uses a gradient`);
      assert.doesNotMatch(body, /#[0-9a-fA-F]{3,8}\b/, `${selector} uses a raw hex colour`);
    }
  }
});

test('cards, icon chips and navigation are flat: no gradients, glass blur or decorative stripes (the phone tab bar may be glass)', () => {
  const css = allCss();
  for (const body of rules(css, '.header-nav')) assert.doesNotMatch(body, /gradient\(/, '.header-nav has no gradient');
  const flat = ['.screen-card', '.menu-card', '.menu-summary-card', '.header-nav-btn.is-active',
    '.action-icon', '.action-icon.chip-blue', '.action-icon.chip-orange', '.action-icon.chip-red', '.action-icon.chip-purple',
    '.action-icon.chip-green', '.action-icon.chip-teal', '.action-icon.chip-gray', '.action-icon.chip-edit-special'];
  for (const selector of flat) {
    for (const body of rules(css, selector)) {
      assert.doesNotMatch(body, /gradient\(|backdrop-filter/, `${selector} is not flat`);
    }
  }
  for (const selector of ['.screen-hero::before', '.menu-summary-card::after', '.modal-card h2::after', '.calendar-card .month-label::after']) {
    assert.equal(rules(css, selector).length, 0, `${selector} decoration is gone`);
  }
  for (let i = 1; i <= 4; i += 1) assert.equal(rules(css, `.menu-card:nth-child(${i})`).length, 0, `menu card ${i} has no own colour`);
});

test('sidebar actions use the neutral icon chip; only observation chips carry colour', () => {
  const source = readFileSync(new URL('../ui/map-grid.js', import.meta.url), 'utf8');
  const sidebar = source.match(/const SIDEBAR_ACTIONS = \[([\s\S]*?)\];/)[1];
  for (const line of sidebar.trim().split('\n')) assert.match(line, /'chip-neutral'/);
  assert.ok(rules(allCss(), '.action-icon.chip-neutral').length, '.action-icon.chip-neutral has a rule');
});

const TOOLS = {
  fertile: { chip: 'fertileRangeActionBtn' },
  coverline: { chip: 'coverlineBtn', button: '.coverline-btn' },
  marker: { chip: 'markersActionBtn', button: '.marker-btn' },
  cross: { chip: 'crossCellsActionBtn', button: '.cross-cells-btn' },
};

test('tool colours are soft pastels that still keep their icons readable', () => {
  const css = read('tokens.css');
  const surface = token(css, '--surface');
  const tints = new Set();
  for (const name of Object.keys(TOOLS)) {
    const icon = token(css, `--tool-${name}`);
    const tint = token(css, `--tool-${name}-tint`);
    assert.ok(icon && tint, `--tool-${name} and --tool-${name}-tint are hex colours`);
    assert.ok(contrast(icon, tint) >= 3, `${name} icon on its tint is ${contrast(icon, tint).toFixed(2)}:1`);
    assert.ok(contrast(icon, surface) <= 4.5, `${name} icon is a soft tone, not a saturated one`);
    assert.ok(contrast(tint, surface) <= 1.2, `${name} tint stays pale`);
    tints.add(tint);
  }
  assert.equal(tints.size, 4, 'the four tools are told apart by colour');
});

test('phone tool chips and desktop tool icons use the same pastel tool colours', () => {
  const css = allCss();
  for (const [name, { chip, button }] of Object.entries(TOOLS)) {
    const body = rules(css, `.mobile-tools-list [data-mobile-tool="${chip}"] .mobile-tool-icon`).join(';');
    assert.match(body, new RegExp(`background:\\s*var\\(--tool-${name}-tint\\)`), `${chip} chip tint`);
    assert.match(body, new RegExp(`color:\\s*var\\(--tool-${name}\\)`), `${chip} chip icon`);
    if (!button) continue;
    const icon = rules(css, `${button} svg`).join(';');
    assert.match(icon, new RegExp(`color:\\s*var\\(--tool-${name}\\)`), `${button} icon colour`);
  }
});

test('the Map info Edit button stands out with the pastel action fill', () => {
  const css = allCss();
  const base = rules(css, '.profile-info-edit').join(';');
  assert.match(base, /background:\s*var\(--action-fill\)/);
  assert.match(base, /color:\s*var\(--action-fill-ink\)/);
  assert.match(rules(css, '.profile-info-edit:hover').join(';'), /background:\s*var\(--action-fill-hover\)/);
});

test('the cervix chip uses the same green as the cervix editor', () => {
  const bodies = rules(allCss(), '.action-icon.chip-teal');
  assert.ok(bodies.length, '.action-icon.chip-teal has a rule');
  for (const body of bodies) {
    assert.match(body, /background:\s*var\(--data-cervix-tint\)/);
    assert.match(body, /color:\s*var\(--data-cervix\)/);
  }
});

test('the phone tab bar is frosted glass, with a solid fallback', () => {
  const css = read('components.css').replace(/\/\*[\s\S]*?\*\//g, '');
  const glass = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter(([, selectors]) => selectors.replace(/\s+/g, ' ').trim() === '.header-nav')
    .map(([, , body]) => body)
    .find(body => /backdrop-filter/.test(body));
  assert.ok(glass, 'the tab bar has a backdrop-filter rule');
  assert.match(glass, /backdrop-filter:\s*saturate\([^)]*\)\s*blur\(/);
  assert.match(glass, /background:\s*color-mix\(in srgb, var\(--surface\) \d+%, transparent\)/);
  assert.match(css, /@supports not \(backdrop-filter: blur\(1px\)\)/, 'browsers without blur get a solid bar');
  assert.match(css, /prefers-reduced-transparency: reduce/, 'reduced transparency gets a solid bar');
});

test('no surface anywhere uses a gradient or glass blur, except the time picker drum fade and the phone tab bar', () => {
  const allowed = new Set(['.time-picker-drum::after', '.header-nav']);
  const offenders = [];
  for (const name of readdirSync(STYLES).filter(file => file.endsWith('.css'))) {
    const css = read(name).replace(/\/\*[\s\S]*?\*\//g, '');
    for (const [, selectors, body] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      if (!/gradient\(|backdrop-filter/.test(body)) continue;
      const selector = selectors.replace(/\s+/g, ' ').trim();
      if (!allowed.has(selector)) offenders.push(`${name}: ${selector}`);
    }
  }
  assert.deepEqual(offenders, []);
});

test('the page ground is one flat token colour', () => {
  for (const body of rules(allCss(), 'body')) assert.doesNotMatch(body, /gradient\(/);
  assert.equal(rules(allCss(), 'body::before').length, 0, 'no decorative layer behind the app');
});

test('the active map card and the map info edit button use the shared tokens', () => {
  const css = allCss();
  for (const selector of ['.map-list-card.is-active', '.profile-info-edit', '.btn.map-delete-btn', '.segmented button.active', '.day.selected']) {
    const bodies = rules(css, selector);
    assert.ok(bodies.length, `${selector} has a rule`);
    for (const body of bodies) assert.doesNotMatch(body, /#[0-9a-fA-F]{3,8}\b|rgba\(\s*(?:104|255),/, `${selector} uses an off-system colour`);
  }
});

test('the legacy card colour and the chart surface resolve to the surface token', () => {
  const theme = read('theme.css');
  assert.match(theme, /--card:\s*var\(--surface\);/);
  for (const body of rules(allCss(), '#mobileMapDock')) assert.doesNotMatch(body, /#[0-9a-fA-F]{3,8}\b/);
});

test('colour values live only in tokens.css; other stylesheets reference tokens', () => {
  const offenders = [];
  for (const name of readdirSync(STYLES).filter(file => file.endsWith('.css') && file !== 'tokens.css')) {
    const hits = read(name).replace(/\/\*[\s\S]*?\*\//g, '').match(/#[0-9a-fA-F]{3,8}\b/g) || [];
    if (hits.length) offenders.push(`${name}: ${hits.length}`);
  }
  assert.deepEqual(offenders, []);
});
