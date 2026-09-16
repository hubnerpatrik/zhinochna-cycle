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
