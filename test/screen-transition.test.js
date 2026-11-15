import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { changeScreen } from '../ui/screen-transition.js';

function fakeDocument() {
  const calls = [];
  return {
    calls,
    startViewTransition(update) {
      const done = Promise.resolve().then(update);
      calls.push(update);
      return { updateCallbackDone: done, ready: Promise.resolve(), finished: done };
    },
  };
}

test('switching between main screens runs the update inside a view transition', async () => {
  const doc = fakeDocument();
  let rendered = 0;
  changeScreen({ from: 'menu', to: 'my-maps', update: () => rendered++, doc });
  assert.equal(doc.calls.length, 1);
  assert.equal(rendered, 0, 'the browser runs the update after it captures the old screen');
  await Promise.resolve();
  assert.equal(rendered, 1);
});

test('everything that is not a plain screen change renders at once', () => {
  const cases = [
    { name: 'first render', from: null, to: 'menu' },
    { name: 'same screen', from: 'active-map', to: 'active-map' },
    { name: 'dialog over a page', from: 'my-maps', to: 'create-map' },
    { name: 'closing that dialog', from: 'create-map', to: 'my-maps' },
    { name: 'profile setup', from: 'profile-setup', to: 'menu' },
  ];
  for (const { name, from, to } of cases) {
    const doc = fakeDocument();
    let rendered = 0;
    changeScreen({ from, to, update: () => rendered++, doc });
    assert.equal(rendered, 1, `${name} renders synchronously`);
    assert.equal(doc.calls.length, 0, `${name} starts no transition`);
  }
});

test('reduced motion and browsers without the API render at once', () => {
  let rendered = 0;
  const doc = fakeDocument();
  changeScreen({ from: 'menu', to: 'my-maps', update: () => rendered++, doc, reducedMotion: () => true });
  changeScreen({ from: 'menu', to: 'my-maps', update: () => rendered++, doc: {} });
  assert.equal(rendered, 2);
  assert.equal(doc.calls.length, 0);
});

test('an error in the update is not swallowed by the transition', async () => {
  const doc = fakeDocument();
  const surfaced = [];
  changeScreen({
    from: 'menu', to: 'my-maps', doc,
    update: () => { throw new Error('render failed'); },
    reportError: error => surfaced.push(error.message),
  });
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.deepEqual(surfaced, ['render failed']);
});

test('a transition that never gets a frame still shows the screen, exactly once', async () => {
  const doc = { startViewTransition: () => ({ ready: Promise.resolve(), finished: Promise.resolve(), updateCallbackDone: new Promise(() => {}) }) };
  let rendered = 0;
  changeScreen({ from: 'menu', to: 'my-maps', update: () => rendered++, doc, stallMs: 5 });
  assert.equal(rendered, 0);
  await new Promise(resolve => setTimeout(resolve, 30));
  assert.equal(rendered, 1);

  // When the browser does run the update in time, the fallback must not run it again.
  const timely = fakeDocument();
  let count = 0;
  changeScreen({ from: 'menu', to: 'my-maps', update: () => count++, doc: timely, stallMs: 5 });
  await new Promise(resolve => setTimeout(resolve, 30));
  assert.equal(count, 1);
});

test('the router renders through the screen transition and styles keep it short and optional', () => {
  const router = readFileSync(new URL('../router.js', import.meta.url), 'utf8');
  assert.match(router, /changeScreen\(/);
  const styles = new URL('../styles/', import.meta.url);
  const css = readdirSync(styles).filter(name => name.endsWith('.css'))
    .map(name => readFileSync(new URL(name, styles), 'utf8')).join('\n');
  assert.match(css, /::view-transition-old\(root\)[^{]*\{[^}]*animation-duration:\s*1\d\dms/, 'a short cross-fade');
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)\s*\{[^@]*::view-transition-group\(\*\)/, 'reduced motion switches it off');
});
