import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const STYLES = new URL('../styles/', import.meta.url);
const raw = readFileSync(new URL('components.css', STYLES), 'utf8');
const components = raw.replace(/\/\*[\s\S]*?\*\//g, '');
const sheets = raw.slice(raw.indexOf('Bottom sheets')).replace(/\/\*[\s\S]*?\*\//g, '');
const everything = readdirSync(STYLES).filter(name => name.endsWith('.css'))
  .map(name => readFileSync(new URL(name, STYLES), 'utf8')).join('\n').replace(/\/\*[\s\S]*?\*\//g, '');

function block(source, opening) {
  const start = source.indexOf(opening);
  if (start < 0) return '';
  const open = source.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < source.length; i += 1) {
    if (source[i] === '{') depth += 1;
    if (source[i] === '}' && --depth === 0) return source.slice(open + 1, i);
  }
  return '';
}

test('on phones dialogs are bottom sheets with a grabber', () => {
  const css = sheets;
  assert.match(css, /\.modal\s*\{[^}]*align-items:\s*flex-end/, 'editor dialogs sit at the bottom');
  assert.match(css, /\.modal-card[^{]*\{[^}]*border-radius:\s*var\(--r-lg\) var\(--r-lg\) 0 0/, 'rounded top corners only');
  assert.match(css, /dialog\.sheet-dialog\s*\{[^}]*inset:\s*auto 0 0/, 'sheet dialogs are anchored to the bottom edge');
  assert.match(css, /\.sheet-handle\s*\{[^}]*touch-action:\s*none/, 'the grabber captures vertical drags');
  assert.match(css, /\.sheet-grip\s*\{[^}]*touch-action:\s*none/, 'the title area captures vertical drags');
});

test('sheets enter and leave along the same path, driven by CSS', () => {
  const css = sheets;
  assert.match(css, /@starting-style/, 'entry starts from the hidden position');
  assert.match(css, /display[^;]*allow-discrete/, 'hiding waits for the leave transition');
  assert.match(css, /\.modal-card[^{]*\{[^}]*transform:\s*translateY\(100%\)/, 'hidden position is below the screen');
  assert.match(css, /dialog\.sheet-dialog(?:\[open\])?\s*\{[^}]*transform:\s*translateY\(/, 'sheet dialogs slide too');
});

test('switching between editors replaces the sheet instead of showing two at once', () => {
  const rule = sheets.match(/:has\(\.modal\.show\)\s*\.modal\.hidden\s*\.modal-card\s*\{([^}]*)\}/)?.[1] || '';
  assert.match(rule, /transition:\s*none/, 'the leaving card disappears at once while another modal is shown');
});

test('the drag offset beats the state transforms and is never animated', () => {
  const rule = everything.match(/\.sheet-dragging[^{]*\{([^}]*)\}/)?.[1] || '';
  assert.match(rule, /translateY\(var\(--sheet-drag-y/);
  assert.match(rule, /transition:\s*none/);
});

test('reduced motion drops the sheet transitions', () => {
  const reduced = block(components, '@media (prefers-reduced-motion: reduce)');
  assert.match(reduced, /transition:\s*none/);
});

test('the old centred Tools animation is gone', () => {
  assert.doesNotMatch(everything, /mobile-tools-in/);
});


test('the calendar card hands horizontal drags to the month swipe and keeps vertical scrolling', () => {
  const rule = everything.match(/\.calendar-card\s*\{[^}]*touch-action:\s*pan-y pinch-zoom[^}]*\}/);
  assert.ok(rule, 'the card, not only the moving grid, sets touch-action: pan-y pinch-zoom');
});

const readSource = path => readFileSync(new URL(path, import.meta.url), 'utf8');

test('Tools, Map info, What\'s new and the profile photo dialog are sheets on phones', () => {
  for (const path of ['../active-map/mobile-map.js', '../ui/profile-info-modal.js', '../ui/release-notes.js', '../views/profile.js']) {
    assert.match(readSource(path), /makeSheetDialog\(/, `${path} makes its dialog a sheet`);
  }
});

test('dialogs with text entry or a full-screen form keep their own layout (an on-screen keyboard could hide a bottom sheet)', () => {
  for (const path of ['../ui/map-dialog.js', '../ui/cycle-summary.js']) {
    assert.doesNotMatch(readSource(path), /makeSheetDialog\(/, `${path} is not a sheet`);
  }
});

test('a dynamic sheet dialog is removed only after its leave transition', () => {
  assert.match(readSource('../ui/profile-info-modal.js'), /removeAfterLeave\(/);
});

test('no leftover ID rule re-centres the Tools sheet (an ID selector beats dialog.sheet-dialog)', () => {
  const geometry = /(?:^|;)\s*(inset|margin|width|max-width|border-radius|box-shadow)\s*:/;
  const offenders = [];
  for (const name of readdirSync(STYLES).filter(file => file.endsWith('.css'))) {
    const source = readFileSync(new URL(name, STYLES), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    for (const [, selectors, body] of source.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      const ids = selectors.split(',').map(part => part.trim()).filter(part => /^#mobileToolsList(?![\w-])\s*$/.test(part));
      if (ids.length && geometry.test(body)) offenders.push(`${name}: #mobileToolsList { ${body.trim().slice(0, 80)} }`);
    }
  }
  assert.deepEqual(offenders, []);
});
