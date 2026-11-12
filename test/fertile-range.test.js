import test from 'node:test';
import assert from 'node:assert/strict';
import { MemoryStorage } from './setup.js';
globalThis.localStorage = new MemoryStorage();
const { store } = await import('../store.js');
const { openFertileRangeModal, closeFertileRangeModal, changeFertileRangeMonth } = await import('../ui/fertile-range-modal.js');

test('fertile picker shows cycle days across months, resets on a new cycle, and keeps selection in a draft', () => {
  let focused;
  const element = () => {
    const attributes = {};
    const classes = new Set();
    return {
      children: [], textContent: '',
      setAttribute(key, value) { attributes[key] = value; },
      getAttribute(key) { return attributes[key]; },
      replaceChildren(...children) { this.children = children; },
      appendChild(child) { this.children.push(child); },
      querySelector(selector) { return this.children.find(child => selector === `[data-date="${child.getAttribute('data-date')}"]`); },
      focus() { focused = attributes['data-date']; },
      classList: { add: value => classes.add(value), remove: value => classes.delete(value), contains: value => classes.has(value), toggle(value, on) { if (on) classes.add(value); else classes.delete(value); } },
    };
  };
  const nodes = { fertileRangeCalendar: element(), fertileRangeMonthLabel: element(), fertileRangeModal: element() };
  globalThis.document = { createElement: element, getElementById: id => nodes[id], querySelectorAll: () => [] };
  store.entries = {
    '2026-03-28': { bleeding: 'menstruation' },
    '2026-03-29': { bleeding: 'menstruation' },
    '2026-04-25': { bleeding: 'menstruation' },
  };
  store.fertileRange = { start: null, end: null };
  store.selectedKey = '2026-03-28';
  openFertileRangeModal();
  const day = key => nodes.fertileRangeCalendar.children.find(child => child.getAttribute('data-date') === key);
  const cycleDay = key => day(key).children.find(child => child.className === 'day-cycle-num')?.textContent;
  assert.equal(cycleDay('2026-03-27'), undefined);
  assert.equal(cycleDay('2026-03-28'), 1);
  assert.equal(cycleDay('2026-03-30'), 3);
  changeFertileRangeMonth(1);
  assert.equal(cycleDay('2026-04-01'), 5);
  assert.equal(cycleDay('2026-04-25'), 1);
  day('2026-04-01').onclick();
  assert.equal(day('2026-04-01').getAttribute('aria-pressed'), 'true');
  assert.equal(focused, '2026-04-01');
  assert.equal(store.entries['2026-04-01'], undefined);
  closeFertileRangeModal();
  openFertileRangeModal(); changeFertileRangeMonth(1);
  assert.equal(day('2026-04-01').getAttribute('aria-pressed'), 'false');
});

test('a fertile-day drag fills every day between two positions, in either direction and across months', async () => {
  const { daysBetween } = await import('../ui/fertile-range-modal.js');
  assert.deepEqual(daysBetween('2026-10-29', '2026-11-02'), ['2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02']);
  assert.deepEqual(daysBetween('2026-10-26', '2026-10-24'), ['2026-10-26', '2026-10-25', '2026-10-24']);
  assert.deepEqual(daysBetween('2026-10-24', '2026-10-24'), ['2026-10-24']);
});

test('several separate fertile ranges save together, and unmarking a day without other data removes it', async () => {
  const { saveFertileRangeModal } = await import('../ui/fertile-range-modal.js');
  const element = () => {
    const attributes = {};
    return {
      children: [], textContent: '', className: '',
      setAttribute(key, value) { attributes[key] = value; },
      getAttribute(key) { return attributes[key]; },
      replaceChildren(...children) { this.children = children; },
      appendChild(child) { this.children.push(child); },
      querySelector(selector) { return this.children.find(child => selector === `[data-date="${child.getAttribute('data-date')}"]`); },
      focus() {},
      classList: { add() {}, remove() {}, contains: () => false, toggle() {} },
    };
  };
  const nodes = { fertileRangeCalendar: element(), fertileRangeMonthLabel: element(), fertileRangeModal: element(), toast: element() };
  globalThis.requestAnimationFrame = callback => { callback(); return 1; };
  globalThis.cancelAnimationFrame = () => {};
  globalThis.document = { createElement: element, getElementById: id => nodes[id], querySelectorAll: () => [] };
  store.reset(); store.createMap('Ranges');
  store.entries['2026-06-01'] = { temp: 36.4 };
  store.entries['2026-06-20'] = { temp: 36.6 };
  store.selectedKey = '2026-06-01';
  const tap = key => nodes.fertileRangeCalendar.children.find(child => child.getAttribute('data-date') === key).onclick();

  openFertileRangeModal();
  ['2026-06-05', '2026-06-06', '2026-06-14', '2026-06-15', '2026-06-25'].forEach(tap);
  saveFertileRangeModal(() => {});
  const fertile = () => Object.keys(store.entries).filter(key => store.entries[key].isFertile).sort();
  assert.deepEqual(fertile(), ['2026-06-05', '2026-06-06', '2026-06-14', '2026-06-15', '2026-06-25']);
  assert.equal(Object.keys(store.entries).sort().at(-1), '2026-06-25');

  openFertileRangeModal();
  ['2026-06-06', '2026-06-25'].forEach(tap);
  saveFertileRangeModal(() => {});
  assert.deepEqual(fertile(), ['2026-06-05', '2026-06-14', '2026-06-15']);
  assert.equal(store.entries['2026-06-06'], undefined);
  assert.equal(store.entries['2026-06-25'], undefined);
  assert.equal(Object.keys(store.entries).sort().at(-1), '2026-06-20');
  assert.equal(store.entries['2026-06-20'].temp, 36.6);
});
