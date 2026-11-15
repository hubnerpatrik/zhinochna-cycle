import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const header = html.match(/<header class="app-header">([\s\S]*?)<\/header>/)?.[1] || '';
const components = readFileSync(new URL('../styles/components.css', import.meta.url), 'utf8');

test('the app header is one bar: brand mark, name, account tools and navigation together', () => {
  assert.match(header, /<svg class="brand-mark"/, 'the brand has its own mark');
  assert.match(header, /<div class="account-bar">/, 'account tools live inside the header');
  assert.doesNotMatch(html.replace(header, ''), /class="account-bar"/, 'no separate account row above the header');
  assert.match(header, /<p class="app-kicker visually-hidden"/, 'the tracked-caps kicker is not shown');
  for (const id of ['navMenuBtn', 'navProfileBtn', 'navMapsBtn', 'navActiveMapBtn', 'accountEmail', 'signOutBtn']) {
    assert.match(header, new RegExp(`id="${id}"`), `${id} keeps its id`);
  }
});

test('on wide screens navigation is plain text tabs with an accent underline, not pills with icons', () => {
  const wide = components.match(/@media \(min-width: 561px\) and \(min-height: 501px\), \(min-width: 561px\) and \(pointer: fine\) \{([\s\S]*?)\n\}/)?.[1] || '';
  assert.ok(wide, 'components.css has a wide-screen header block');
  assert.match(wide, /\.nav-icon\s*\{[^}]*display:\s*none/, 'tab icons are hidden');
  assert.match(wide, /\.header-nav-btn\.is-active\s*\{[^}]*box-shadow:\s*inset 0 -2px 0 var\(--action\)/, 'current tab is underlined in the accent');
  assert.match(wide, /\.header-nav\s*\{[^}]*background:\s*transparent/, 'the tab row has no container box');
  assert.doesNotMatch(wide, /border-radius:\s*(?:1[0-9]|[2-9][0-9])px[^}]*\}/, 'no rounded pill containers');
});
