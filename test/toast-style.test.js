import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const STYLES = new URL('../styles/', import.meta.url);
const css = readdirSync(STYLES).filter(name => name.endsWith('.css'))
  .map(name => readFileSync(new URL(name, STYLES), 'utf8')).join('\n').replace(/\/\*[\s\S]*?\*\//g, '');

function rule(selector) {
  const wanted = selector.replace(/\s+/g, ' ');
  return [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter(([, selectors]) => selectors.split(',').some(part => part.replace(/\s+/g, ' ').trim() === wanted))
    .map(([, , body]) => body).join(';');
}

test('a message with one button sits on a single row: text left, button right, no empty space', () => {
  const row = rule('.toast.action-toast.toast-inline');
  assert.match(row, /flex-wrap:\s*nowrap/, 'it does not stack the button under the text');
  assert.match(row, /justify-content:\s*space-between/);
  assert.match(row, /text-align:\s*left/);
  assert.match(rule('.toast.action-toast.toast-inline > span'), /flex:\s*1 1 auto/, 'the text takes the free width instead of a full row');
});

test('the single-button toast stays compact and its button keeps a 44px touch target', () => {
  const padding = rule('.toast.action-toast.toast-inline').match(/padding:\s*(\d+)px (\d+)px (\d+)px (\d+)px/);
  assert.ok(padding && Number(padding[1]) <= 8, 'little padding above and below the button');
  assert.match(rule('.toast.action-toast.toast-inline .toast-action'), /min-height:\s*44px/);
});
