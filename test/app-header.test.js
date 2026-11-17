import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const header = html.match(/<header class="app-header">([\s\S]*?)<\/header>/)?.[1] || '';
const components = readFileSync(new URL('../styles/components.css', import.meta.url), 'utf8');

test('the app header is one bar: brand mark, name, account tools and navigation together', () => {
  assert.match(header, /<svg class="brand-mark[ "]/, 'the brand has its own mark');
  assert.match(header, /<div class="account-bar">/, 'account tools live inside the header');
  assert.doesNotMatch(html.replace(header, ''), /class="account-bar"/, 'no separate account row above the header');
  assert.match(header, /<p class="app-kicker visually-hidden"/, 'the tracked-caps kicker is not shown');
  for (const id of ['navMenuBtn', 'navProfileBtn', 'navMapsBtn', 'navActiveMapBtn', 'accountEmail', 'signOutBtn']) {
    assert.match(header, new RegExp(`id="${id}"`), `${id} keeps its id`);
  }
});

test('tabs run Home, Active Map, Maps, Profile: from the overview to daily recording, the map library and settings', () => {
  const order = [...header.matchAll(/<button id="(nav\w+Btn)"/g)].map(match => match[1]);
  assert.deepEqual(order, ['navMenuBtn', 'navActiveMapBtn', 'navMapsBtn', 'navProfileBtn']);
});

test('phones show the Home tab in the bottom bar, four tabs side by side', () => {
  const menuBtn = header.match(/<button id="navMenuBtn"[\s\S]*?<\/button>/)?.[0] || '';
  assert.match(menuBtn, /class="nav-label-mobile"[^>]*>Home</, 'the Home tab has its phone label');
  const refresh = readFileSync(new URL('../styles/mobile.css', import.meta.url), 'utf8');
  assert.doesNotMatch(refresh, /#navMenuBtn\s*\{\s*display:\s*none|, #navMenuBtn \{ display: none/, 'phones no longer hide the Home tab');
  assert.match(refresh, /\.header-nav \{[^}]*grid-template-columns: repeat\(4, minmax\(0, 1fr\)\)/, 'the tab bar holds four tabs');
});

test('on wide screens navigation is plain text tabs with an accent underline, not pills with icons', () => {
  const wide = components.match(/@media \(min-width: 561px\) and \(min-height: 501px\), \(min-width: 561px\) and \(pointer: fine\) \{([\s\S]*?)\n\}/)?.[1] || '';
  assert.ok(wide, 'components.css has a wide-screen header block');
  assert.match(wide, /\.nav-icon\s*\{[^}]*display:\s*none/, 'tab icons are hidden');
  assert.match(wide, /\.header-nav-btn\.is-active\s*\{[^}]*box-shadow:\s*inset 0 -2px 0 var\(--action\)/, 'current tab is underlined in the accent');
  assert.match(wide, /\.header-nav\s*\{[^}]*background:\s*transparent/, 'the tab row has no container box');
  assert.doesNotMatch(wide, /border-radius:\s*(?:1[0-9]|[2-9][0-9])px[^}]*\}/, 'no rounded pill containers');
});

test('on wide screens every tab has a visible label, so the Home tab is not an empty underlined box', () => {
  const wide = components.match(/@media \(min-width: 561px\) and \(min-height: 501px\), \(min-width: 561px\) and \(pointer: fine\) \{([\s\S]*?)\n\}/)?.[1] || '';
  assert.match(wide, /\.nav-label-mobile \{ display: inline; \}/, 'wide screens show the short labels');
  for (const button of header.match(/<button id="nav\w+Btn"[\s\S]*?<\/button>/g)) {
    assert.match(button, /class="nav-label-mobile"/, 'every tab carries a short label');
  }
});

test('on phones the header makes no stacking context, so the fixed tab bar stays above page content', () => {
  const phone = [...components.matchAll(/@media \(max-width: 560px\), \(max-height: 500px\) and \(pointer: coarse\) \{([\s\S]*?)\n\}/g)].map(match => match[1]).join('\n');
  assert.match(components, /\.app-header \{[^}]*isolation: isolate/, 'wide screens isolate the header for the sprig');
  assert.match(phone, /\.app-header \{[^}]*isolation: auto/, 'phones undo it for the tab bar');
});

test('on wide screens the language menu opens under its own button, not across the whole header', () => {
  const wide = components.match(/@media \(min-width: 561px\) and \(min-height: 501px\), \(min-width: 561px\) and \(pointer: fine\) \{([\s\S]*?)\n\}/)?.[1] || '';
  const picker = wide.match(/\.app-header > \.language-picker \{([^}]*)\}/)?.[1] || '';
  assert.ok(picker, 'the wide header places the picker in its grid area');
  assert.doesNotMatch(picker, /position:\s*static/, 'a static picker would anchor its 100%-wide menu to the header');
  assert.match(picker, /position:\s*relative/);
});
