import test from 'node:test';
import assert from 'node:assert/strict';
import { MemoryStorage } from './setup.js';

globalThis.localStorage = new MemoryStorage();
const { store, Store } = await import('../store.js');
const { createChartInteractions } = await import('../active-map/chart-interactions.js');

function editor(onToolCancel) {
  const nodes = new Map();
  const element = () => {
    const classes = new Set();
    return { children: [], textContent: '', className: '',
      classList: { add: (...items) => items.forEach(item => classes.add(item)), remove: (...items) => items.forEach(item => classes.delete(item)), toggle: (item, active) => active ? classes.add(item) : classes.delete(item) },
      setAttribute() {}, removeAttribute() {},
      replaceChildren(...children) { this.children = children; },
      cloneNode() { return element(); },
      replaceWith(next) { nodes.set('toast', next); },
    };
  };
  for (const id of ['toast', 'markersActionBtn', 'crossCellsActionBtn', 'coverlineBtn']) nodes.set(id, element());
  globalThis.document = { getElementById: id => nodes.get(id), createElement: element };
  globalThis.requestAnimationFrame = callback => { callback(); return 1; };
  globalThis.cancelAnimationFrame = () => {};
  const interactions = createChartInteractions({ getColumns: () => [], renderApp() {}, selectColumn() {}, showMessage() {}, onToolCancel });
  interactions.init();
  return { interactions, start: () => nodes.get('coverlineBtn').onclick(),
    cancel: () => nodes.get('toast').children.find(button => button.textContent === 'Cancel').onclick(),
    save: () => nodes.get('toast').children.find(button => button.textContent === 'Save').onclick(),
  };
}

test('coverline cancellation restores saved geometry, including after another action persisted the draft', () => {
  store.reset(); const map = store.createMap('Draft');
  store.coverlines.default = { horizontalTemp: 36.5 }; store.save();
  let canceled = 0;
  const controls = editor(() => { canceled += 1; }); controls.start();
  store.coverlines.default.horizontalTemp = 37;
  store.save(); // A separate save must not defeat Cancel.
  controls.cancel();
  assert.equal(store.coverlines.default.horizontalTemp, 36.5);
  assert.equal(new Store().getMap(map.id).coverlines.default.horizontalTemp, 36.5);
  assert.equal(canceled, 1);
  controls.start(); store.coverlines.default.horizontalTemp = 36.8; controls.save();
  assert.equal(new Store().getMap(map.id).coverlines.default.horizontalTemp, 36.8);
  assert.equal(canceled, 1);
});

test('leaving a coverline draft restores its own map without overwriting the newly selected map', () => {
  store.reset(); const first = store.createMap('First');
  store.coverlines.default = { horizontalTemp: 36.5 }; store.save();
  const second = store.createMap('Second');
  store.coverlines.default = { horizontalTemp: 36.9 }; store.save();
  store.setActiveMapId(first.id);
  const controls = editor(() => assert.fail('Leaving a map must not reopen its tool menu')); controls.start();
  store.coverlines.default.horizontalTemp = 37.1;
  store.setActiveMapId(second.id);
  controls.interactions.deactivate();
  assert.equal(store.getMap(first.id).coverlines.default.horizontalTemp, 36.5);
  assert.equal(store.coverlines.default.horizontalTemp, 36.9);
  assert.equal(new Store().getMap(second.id).coverlines.default.horizontalTemp, 36.9);
});

test('marker mode stays on after a marker editor closes and ends only with Done', () => {
  store.reset(); store.createMap('Markers');
  let ended = 0;
  const nodes = new Map();
  const element = () => {
    const classes = new Set();
    return { children: [], textContent: '', className: '',
      classList: { add: (...items) => items.forEach(item => classes.add(item)), remove: (...items) => items.forEach(item => classes.delete(item)), toggle: (item, active) => active ? classes.add(item) : classes.delete(item), contains: item => classes.has(item) },
      setAttribute() {}, removeAttribute() {},
      replaceChildren(...children) { this.children = children; },
      cloneNode() { return element(); },
      replaceWith(next) { nodes.set('toast', next); },
    };
  };
  for (const id of ['toast', 'markersActionBtn', 'crossCellsActionBtn', 'coverlineBtn']) nodes.set(id, element());
  globalThis.document = { getElementById: id => nodes.get(id), createElement: element };
  const interactions = createChartInteractions({ getColumns: () => [], renderApp() {}, selectColumn() {}, showMessage() {}, onToolEnd: () => { ended += 1; } });
  interactions.init();

  nodes.get('markersActionBtn').onclick();
  assert.equal(store.markerSelectionMode, true);
  assert.ok(nodes.get('toast').children.some(child => child.textContent === 'Done'));

  // A marker editor replaced the pill with a message; returning shows it again.
  nodes.set('toast', element());
  interactions.resumeMarkerPlacement();
  assert.equal(store.markerSelectionMode, true);
  const done = nodes.get('toast').children.find(child => child.textContent === 'Done');
  assert.ok(done);

  done.onclick();
  assert.equal(store.markerSelectionMode, false);
  assert.equal(ended, 1);
  nodes.set('toast', element());
  interactions.resumeMarkerPlacement();
  assert.equal(nodes.get('toast').children.length, 0);
});
