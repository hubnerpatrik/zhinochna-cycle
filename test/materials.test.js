import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const STYLES = new URL('../styles/', import.meta.url);
const css = readdirSync(STYLES).filter(n => n.endsWith('.css'))
  .map(n => readFileSync(new URL(n, STYLES), 'utf8')).join('\n').replace(/\/\*[\s\S]*?\*\//g, '');

// Body of every @media block whose prelude matches `query` (the block's full text, nesting included).
function mediaBlocks(source, query) {
  const out = [];
  let from = 0;
  while (true) {
    const at = source.indexOf('@media', from);
    if (at < 0) return out;
    const open = source.indexOf('{', at);
    const prelude = source.slice(at, open);
    let depth = 0;
    let end = open;
    for (; end < source.length; end += 1) {
      if (source[end] === '{') depth += 1;
      if (source[end] === '}' && --depth === 0) break;
    }
    if (query.test(prelude)) out.push(source.slice(open + 1, end));
    from = open + 1;
  }
}

test('with reduced motion dialogs and sheets still fade instead of popping', () => {
  const body = mediaBlocks(css, /prefers-reduced-motion: reduce\)\s*$/).join('\n');
  assert.match(body, /\.modal[^{]*\{[^}]*transition:\s*opacity/, 'editors cross-fade');
  assert.match(body, /dialog\.sheet-dialog[^{]*\{[^}]*transition:\s*opacity/, 'dialogs cross-fade');
  assert.doesNotMatch(body, /dialog\.sheet-dialog[^{]*\{[^}]*transition:\s*none/, 'and are not switched to no transition');
});

test('the frosted tab bar turns solid for reduced transparency on every screen size', () => {
  const solid = mediaBlocks(css, /^@media \(prefers-reduced-transparency: reduce\)\s*$/).join('\n');
  assert.match(solid, /\.header-nav[^{]*\{[^}]*background:\s*var\(--surface\)/);
  assert.match(solid, /\.header-nav[^{]*\{[^}]*backdrop-filter:\s*none/);
});

test('high contrast also makes the tab bar solid, with a firm top line', () => {
  const body = mediaBlocks(css, /^@media \(prefers-contrast: more\)\s*$/).join('\n');
  assert.match(body, /\.header-nav[^{]*\{[^}]*background:\s*var\(--surface\)/);
  assert.match(body, /\.header-nav[^{]*\{[^}]*border-top-color:\s*var\(--line\)/);
});

test('the tab bar edge is a soft hairline over the content, not a hard rule', () => {
  const phone = mediaBlocks(css, /max-width: 560px/).join('\n');
  assert.match(phone, /\.header-nav\s*\{[^}]*border-top:\s*1px solid color-mix\(/);
});
