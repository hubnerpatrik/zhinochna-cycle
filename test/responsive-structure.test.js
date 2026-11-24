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

test('a map card\'s export and more buttons differ from the card and from each other', () => {
  // Export takes the coral family of Open map; ⋯ stays a neutral warm fill.
  const exportRule = css.match(/\.map-list-actions \.btn\.map-export-btn\s*\{([^}]*)\}/);
  assert.ok(exportRule, 'export has its own rule');
  assert.match(exportRule[1], /background:\s*var\(--action-tint\)/);
  assert.match(exportRule[1], /color:\s*var\(--action\)/);
  const hover = css.match(/\.map-list-actions \.btn\.map-export-btn:hover\s*\{([^}]*)\}/);
  assert.ok(hover && /background:\s*var\(--action-tint\)/.test(hover[1]), 'hover keeps the coral tint');
  const moreRule = css.match(/\.map-list-actions \.map-more-btn\s*\{([^}]*)\}/);
  assert.ok(moreRule, '⋯ has its own rule');
  assert.match(moreRule[1], /background:\s*var\(--surface-alt\)/);
  assert.match(moreRule[1], /border-color:\s*transparent/);
});

test('on phones the calendar dots sit in their own strip below the day number', () => {
  // A centred number with a tall line box ran into the dots at 320 and 390 px.
  const phone = [...css.matchAll(/@media \(max-width: 560px\)[^{]*\{([\s\S]*?)\n\}/g)].map(match => match[1]).join('\n');
  const day = phone.match(/#calendar \.day\s*\{([^}]*)\}/g)?.find(rule => /padding-bottom/.test(rule));
  assert.ok(day, 'phone days reserve room under the number');
  assert.match(day, /line-height:\s*1;/);
  assert.match(day, /padding-bottom:\s*5px/);
  const marks = phone.match(/\.day-marks\s*\{([^}]*)\}/);
  assert.ok(marks && /bottom:\s*3px/.test(marks[1]), 'dots sit 3 px above the cell edge');
});
