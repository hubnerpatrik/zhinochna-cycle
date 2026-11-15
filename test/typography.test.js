import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const STYLES = new URL('../styles/', import.meta.url);
const files = readdirSync(STYLES).filter(name => name.endsWith('.css'));
const css = files.map(name => readFileSync(new URL(name, STYLES), 'utf8')).join('\n').replace(/\/\*[\s\S]*?\*\//g, '');
const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');

function rule(selector) {
  const wanted = selector.replace(/\s+/g, ' ');
  return [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter(([, selectors]) => selectors.split(',').some(part => part.replace(/\s+/g, ' ').trim() === wanted))
    .map(([, , body]) => body).join(';');
}

test('labels are plain sentence-case text: no capitals-only styling and no tracked letters', () => {
  assert.doesNotMatch(css, /text-transform:\s*uppercase/);
  const tracking = [...css.matchAll(/letter-spacing:\s*(-?[\d.]+)(em|px)/g)].filter(([, value]) => Number(value) > 0);
  assert.deepEqual(tracking.map(match => match[0]), [], 'no positive letter-spacing');
});

test('every label recipe is at least 13px', () => {
  const labels = ['.screen-kicker', '.menu-summary-label', '.info-title', '.profile-info-title', '.info-label', '.input-label', '.time-picker-label'];
  for (const selector of labels) {
    const body = rule(selector);
    assert.ok(body, `${selector} has a rule`);
    const size = body.match(/font-size:\s*([\d.]+)rem/);
    assert.ok(size && Number(size[1]) >= 0.8125, `${selector} is at least 0.8125rem`);
  }
});

test('font sizes scale with the reader\'s text setting: rem, never fixed pixels', () => {
  const withoutIosGuard = css.split('max(16px, 1rem)').join('');
  const fixed = [...withoutIosGuard.matchAll(/font-size:\s*[^;}]*?\b[\d.]+px/g)].map(match => match[0]);
  assert.deepEqual(fixed, []);
});

test('inputs keep at least 16px so phones do not zoom the page when they are focused', () => {
  assert.match(css, /font-size:\s*max\(16px, 1rem\)/);
});

test('screens do not repeat their own name in a small label above the heading', () => {
  for (const path of ['../views/create-map.js', '../views/menu.js', '../views/my-maps.js', '../views/profile.js']) {
    assert.doesNotMatch(read(path), /screen-kicker/, `${path} has no kicker`);
  }
});

test('calendar cells have a fixed size, so their text follows the reader only up to what a cell can hold', () => {
  assert.match(rule('.calendar-grid'), /container-type:\s*inline-size/, 'the grid is a size container');
  assert.match(rule('#calendar .day'), /font-size:\s*min\([\d.]+rem,\s*[\d.]+cqi\)/, 'day numbers are capped by the cell width');
  assert.match(rule('#calendar .day-cycle-num'), /font-size:\s*min\([\d.]+rem,\s*[\d.]+cqi\)/, 'cycle-day badges are capped by the cell width');
});
