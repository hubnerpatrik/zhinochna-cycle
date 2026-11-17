import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const STYLES = new URL('../styles/', import.meta.url);
const files = readdirSync(STYLES).filter(name => name.endsWith('.css'));
const strip = source => source.replace(/\/\*[\s\S]*?\*\//g, '');

// Every style rule with its chain of enclosing at-rule preludes.
function allRules(source) {
  const out = [];
  const stack = [];
  let start = 0;
  for (let i = 0; i < source.length; i += 1) {
    if (source[i] === '{') {
      stack.push(source.slice(start, i).trim());
      start = i + 1;
    } else if (source[i] === '}') {
      const prelude = stack.pop();
      if (prelude && !prelude.startsWith('@')) {
        out.push({ selector: prelude, context: stack.filter(p => p.startsWith('@')).join(' '), body: source.slice(start, i) });
      }
      start = i + 1;
    } else if (source[i] === ';' && stack.length === 0) start = i + 1;
  }
  return out;
}

const rules = files.flatMap(name => allRules(strip(readFileSync(new URL(name, STYLES), 'utf8'))).map(r => ({ ...r, file: name })));

test('hover styles only apply to devices that can hover', () => {
  const stuck = rules.filter(r => /:hover/.test(r.selector) && !/hover:\s*hover/.test(r.context));
  assert.deepEqual(stuck.map(r => `${r.file}: ${r.selector}`), []);
});

test('pressed state uses the shared press scale, not hand-picked numbers', () => {
  const tokens = strip(readFileSync(new URL('tokens.css', STYLES), 'utf8'));
  assert.match(tokens, /--press-scale:\s*0\.97/);
  assert.match(tokens, /--press-scale-small:/);
  const hardcoded = rules.filter(r => /:active/.test(r.selector) && /transform:\s*scale\(\s*0?\.\d+/.test(r.body));
  assert.deepEqual(hardcoded.map(r => `${r.file}: ${r.selector}`), []);
});

test('cards and chips give instant feedback when pressed', () => {
  const pressed = rules.filter(r => /:active/.test(r.selector) && /--press-scale/.test(r.body)).map(r => r.selector).join('\n');
  for (const selector of ['.menu-card', '.map-list-card', 'button.menu-summary-card', '.segmented button', '.language-picker-trigger', '.home-pill', '.cycle-summary-card']) {
    assert.ok(pressed.includes(selector), `${selector} has a pressed state`);
  }
});

test('taps are not delayed and pinch zoom stays available', () => {
  assert.ok(rules.some(r => /(^|,\s*)html\b/.test(r.selector) && /touch-action:\s*manipulation/.test(r.body)));
});

test('small touch targets get an invisible larger hit area', () => {
  const hit = rules.filter(r => /::after/.test(r.selector) && /inset:\s*-/.test(r.body)).map(r => r.selector).join('\n');
  for (const selector of ['.day', '.home-changelog']) assert.ok(hit.includes(selector), `${selector} has an enlarged hit area`);
});

test('click suppression after a drag does not rely on a zero-delay timer', () => {
  for (const file of ['../active-map/chart-interactions.js', '../ui/fertile-range-modal.js']) {
    assert.doesNotMatch(readFileSync(new URL(file, import.meta.url), 'utf8'), /setTimeout\(\(\) => \{ suppressNextClick/, file);
  }
});
