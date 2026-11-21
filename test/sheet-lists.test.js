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

// Bodies of every rule whose selector list contains exactly `selector`.
function rules(css, selector) {
  return [...css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter(([, selectors]) => selectors.split(',').some(part => part.replace(/\s+/g, ' ').trim() === selector))
    .map(([, , body]) => body).join(';');
}

test('Edit Day and Tools are the same grouped garden list', () => {
  const css = allCss();
  assert.match(rules(css, '.action-list'), /background: var\(--list-ground\)/, 'Edit Day rows sit on the garden list ground');
  const rows = rules(css, '#mobileToolsList > button');
  assert.match(rows, /background: var\(--list-ground\)/, 'Tools rows sit on the same ground');
  assert.match(rows, /border: 0/, 'Tools rows are not separate bordered boxes');
  assert.match(rows, /min-height: 52px/, 'Tools rows match the Edit Day row height');
  assert.match(rules(css, '#mobileToolsList > button + button'), /box-shadow: inset 0 1px 0 var\(--line-soft\)/, 'rows are divided like Edit Day');
  assert.match(rules(css, '#mobileToolsList h2'), /font-size: 1\.125rem/, 'both sheet titles share one size');
});

test('every chip in both sheets is a pastel tint with its icon in the matching deeper hue', () => {
  const css = allCss();
  const tokens = read('styles/tokens.css');
  const chips = { '.action-icon.chip-orange': 'temperature', '.action-icon.chip-red': 'bleeding', '.action-icon.chip-blue': 'mucus' };
  for (const [selector, name] of Object.entries(chips)) {
    const body = rules(css, selector);
    assert.match(body, new RegExp(`background: var\\(--chip-${name}-tint\\)`), `${selector} tint`);
    assert.match(body, new RegExp(`color: var\\(--chip-${name}\\)`), `${selector} icon hue`);
    const [ink, tint] = [hex(tokens, `--chip-${name}`), hex(tokens, `--chip-${name}-tint`)];
    assert.ok(ink && tint, `--chip-${name} tokens are hex colours`);
    assert.ok(contrast(ink, tint) >= 3, `${name} icon on its tint is ${contrast(ink, tint).toFixed(2)}:1`);
    assert.ok(contrast(tint, hex(tokens, '--surface')) <= 1.2, `${name} tint stays pale like the tool tints`);
  }
  for (const selector of ['.action-icon', '.mobile-tool-icon']) {
    assert.match(rules(css, selector), /box-shadow: inset 0 0 0 1px/, `${selector}: one soft ring keeps every chip crisp on the garden ground`);
  }
});

test('the Tools close button is drawn, not a text glyph', () => {
  const html = read('index.html');
  const close = html.match(/<button id="mobileCloseToolsBtn"[\s\S]*?<\/button>/)?.[0] || '';
  assert.doesNotMatch(close, />×</);
  assert.match(close, /<svg/);
});

test('Edit Day leads the sidebar actions as the one coral primary row', () => {
  const css = allCss();
  const row = rules(css, '#sidebarActions #editBtn');
  assert.match(row, /background: var\(--action-fill\)/, 'Edit Day is filled with the action colour');
  assert.match(row, /color: var\(--action-fill-ink\)/, 'its label is the action ink');
  assert.match(rules(css, '#sidebarActions #editBtn:hover'), /background: var\(--action-fill-hover\)/);
  assert.match(rules(css, '#sidebarActions #editBtn .action-icon'), /color: var\(--action-fill-ink\)/, 'its chip and icon read on coral');
});
