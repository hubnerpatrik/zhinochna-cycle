import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';

const STYLES = new URL('../styles/', import.meta.url);
const files = readdirSync(STYLES).filter(name => name.endsWith('.css'));
const css = files.map(name => readFileSync(new URL(name, STYLES), 'utf8')).join('\n').replace(/\/\*[\s\S]*?\*\//g, '');

test('there are no catch-up stylesheets layered over the main ones', () => {
  for (const name of ['mobile-refresh.css', 'feedback-improvements.css']) {
    assert.equal(existsSync(new URL(name, STYLES)), false, `${name} is merged into the files it styles`);
  }
  const index = readFileSync(new URL('index.css', STYLES), 'utf8');
  assert.doesNotMatch(index, /mobile-refresh|feedback-improvements/);
});

// Layout tiers: phone up to 560, mid 561-900, wide above 900. The rest fit content, not devices:
// 359 and 380 are the narrowest phones (calendar cells, four-way switches), 1100 is the app's maximum width.
const ALLOWED_WIDTHS = new Set([359, 380, 560, 561, 900, 1100]);

test('width breakpoints come from one small set', () => {
  const found = [...css.matchAll(/\((?:min|max)-width:\s*(\d+)px\)/g)].map(match => Number(match[1]));
  const strays = [...new Set(found.filter(width => !ALLOWED_WIDTHS.has(width)))];
  assert.deepEqual(strays, []);
});

test('the phone day card shows a missing temperature as a quiet label that fits a 320 px screen', () => {
  // At the 2rem reading size "No temperature" ran past the card edge on the narrowest phones.
  const source = readFileSync(new URL('../active-map/mobile-map.js', import.meta.url), 'utf8');
  assert.match(source, /mobileSelectedTemp[\s\S]{0,200}classList\.toggle\(['"]is-empty['"],\s*temp == null\)/);
  const rule = css.match(/#mobileSelectedTemp\.is-empty\s*\{([^}]*)\}/);
  assert.ok(rule, 'an empty temperature has its own rule');
  const size = rule[1].match(/font-size:\s*([\d.]+)rem/);
  assert.ok(size && Number(size[1]) <= 1, 'the empty label is body-sized, not the 2rem reading');
  assert.match(rule[1], /color:\s*var\(--ink-muted\)/);
});

test('a map card\'s export and more buttons are tinted so they stand apart from the white card', () => {
  const rule = css.match(/\.map-list-actions \.map-export-btn,\s*\.map-list-actions \.map-more-btn\s*\{([^}]*)\}/);
  assert.ok(rule, 'one shared rule tints both icon buttons');
  assert.match(rule[1], /background:\s*var\(--surface-alt\)/);
  assert.match(rule[1], /border-color:\s*transparent/);
});
