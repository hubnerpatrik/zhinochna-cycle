import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const allCss = () => readdirSync(new URL('../styles/', import.meta.url))
  .filter(name => name.endsWith('.css')).map(name => read(`styles/${name}`)).join('\n');

function hex(css, name) {
  return css.match(new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6})\\b`))?.[1];
}

function luminance(value) {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(value.slice(i, i + 2), 16) / 255)
    .map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

test('the page ground is a pale garden tone that matches the home meadow', () => {
  const tokens = read('styles/tokens.css');
  const bg = hex(tokens, '--page-ground');
  const [r, g, b] = [1, 3, 5].map(i => parseInt(bg.slice(i, i + 2), 16));
  assert.ok(g > r && g > b, `--bg ${bg} leans green, like the meadow`);
  assert.ok(contrast(bg, hex(tokens, '--surface')) <= 1.12, 'white cards still lift gently off it');
  assert.equal(hex(tokens, '--bg'), '#f7f3f0', 'the warm inset ground inside panels is unchanged');
  assert.match(read('styles/components.css'), /body \{\s*background: var\(--page-ground\);/, 'only the page body takes the garden ground');
});

test('screen and sheet titles share the rounded display face of the home page', () => {
  assert.match(read('styles/tokens.css'), /--font-display: "Rubik Variable"/);
  const css = allCss();
  for (const selector of ['.screen-hero h2', '#mapDialogTitle', '#profilePhotoTitle', '.month-label', '.mobile-map-header strong', '.active-map-name']) {
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    assert.match(css, new RegExp(`${escaped}[^{]*\\{[^}]*font-family: var\\(--font-display\\)`), `${selector} uses the display face`);
  }
});

test('each screen title carries a small decorative sprig; the empty map list shows a gerbera', () => {
  for (const view of ['views/profile.js', 'views/my-maps.js', 'views/create-map.js']) {
    assert.match(read(view), /\$\{gardenSprig\(\)\}\s*<h2/, `${view} sets a sprig above its title`);
  }
  const utils = read('views/view-utils.js');
  assert.match(utils, /export function gardenSprig\(\)/);
  assert.match(utils, /class="garden-sprig"[^>]*aria-hidden="true"/);
  assert.match(utils, /class="garden-bloom"[^>]*aria-hidden="true"/);
  assert.match(read('views/my-maps.js'), /empty-state">\s*\$\{gardenBloom\(\)\}/);
});

test('the active map stays clear of flowers: only its frame changes', () => {
  const html = read('index.html');
  const activeMap = html.slice(html.indexOf('<section id="activeMapScreen"'), html.indexOf('</main>'));
  assert.doesNotMatch(activeMap, /garden-sprig|garden-bloom|gerbera/);
  for (const name of readdirSync(new URL('../active-map/', import.meta.url))) {
    assert.doesNotMatch(read(`active-map/${name}`), /gardenSprig|gardenBloom/, `${name} draws no flowers`);
  }
  const garden = read('styles/garden.css');
  assert.doesNotMatch(garden, /\.day\b|calendar-grid|#chart|canvas|data-/, 'calendar cells, chart and data colours are untouched');
  assert.doesNotMatch(garden, /\.modal-card/, 'the active map dialogs (Edit Day and its sheets) keep Inter titles');
});
