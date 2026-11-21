import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const tokens = readFileSync(new URL('../styles/tokens.css', import.meta.url), 'utf8');
const token = name => tokens.match(new RegExp(`${name}:\\s*([^;]+);`))?.[1].trim();
const rgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)).join(',');

test('chart.js draws only with colours from the shared chart palette', () => {
  const source = readFileSync(new URL('../chart.js', import.meta.url), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  const literals = source.match(/['"](?:#[0-9a-fA-F]{3,8}|rgba?\([^)]*\)|white|black)['"]/g) || [];
  assert.deepEqual(literals, []);
});

test('interface colours in the chart palette follow the design tokens', async () => {
  const { CHART_COLORS } = await import('../chart-palette.js');
  assert.equal(CHART_COLORS.ink, token('--ink'));
  assert.equal(CHART_COLORS.inkMuted, token('--ink-muted'));
  assert.equal(CHART_COLORS.paper, token('--surface'));
  const action = rgb(token('--action'));
  for (const key of ['selection', 'hover']) {
    assert.match(CHART_COLORS[key].replace(/\s/g, ''), new RegExp(`^rgba\\(${action},`), `${key} derives from --action`);
  }
  const ink = rgb(token('--ink'));
  for (const key of ['gridMajor', 'gridMinor']) {
    assert.match(CHART_COLORS[key].replace(/\s/g, ''), new RegExp(`^rgba\\(${ink},`), `${key} derives from --ink`);
  }
});

test('observation colours in the chart match the data tokens used by the interface', async () => {
  const { CHART_COLORS } = await import('../chart-palette.js');
  assert.equal(CHART_COLORS.adjusted, token('--data-adjusted'));
  assert.equal(CHART_COLORS.fertile, token('--data-fertile'));
  assert.equal(CHART_COLORS.coverline, token('--data-coverline'));
  assert.equal(CHART_COLORS.overflow, token('--data-overflow'));
});
