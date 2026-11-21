import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const STYLES = new URL('../styles/', import.meta.url);
const css = readdirSync(STYLES).filter(name => name.endsWith('.css'))
  .map(name => readFileSync(new URL(name, STYLES), 'utf8')).join('\n')
  .replace(/\/\*[\s\S]*?\*\//g, '');
const bindings = readFileSync(new URL('../active-map/bindings.js', import.meta.url), 'utf8');

// Body of the first @media block whose query matches `query` (one level of nesting).
function mediaBlock(source, query) {
  const start = source.search(query);
  if (start < 0) return '';
  let depth = 0;
  for (let i = source.indexOf('{', start); i < source.length; i += 1) {
    if (source[i] === '{') depth += 1;
    if (source[i] === '}' && --depth === 0) return source.slice(source.indexOf('{', start) + 1, i);
  }
  return '';
}

test('primary buttons do not start an endless attention pulse after a click', () => {
  assert.doesNotMatch(bindings, /pulse-attention|animatePrimaryButton/);
  assert.doesNotMatch(css, /animation[^;{}]*\binfinite\b/, 'no stylesheet loops an animation forever');
  assert.doesNotMatch(css, /@keyframes\s+warmPulse/);
});

test('reduced motion keeps dialogs to a plain fade and stops every animation', () => {
  const components = readFileSync(new URL('components.css', STYLES), 'utf8');
  const block = mediaBlock(components, /@media \(prefers-reduced-motion: reduce\)/);
  assert.ok(block, 'components.css has a reduced-motion block');
  assert.match(block, /\.modal-card[^{]*\{[^}]*transform:\s*none/, 'dialogs do not scale or slide');
  assert.match(block, /animation:\s*none\s*!important/, 'animations are switched off');
});

test('high contrast preference strengthens lines and quiet text', () => {
  const tokens = readFileSync(new URL('tokens.css', STYLES), 'utf8');
  const block = mediaBlock(tokens, /@media \(prefers-contrast: more\)/);
  assert.ok(block, 'tokens.css has a prefers-contrast: more block');
  for (const name of ['--line', '--line-soft', '--ink-muted']) {
    assert.match(block, new RegExp(`${name}:`), `${name} is redefined for high contrast`);
  }
});
