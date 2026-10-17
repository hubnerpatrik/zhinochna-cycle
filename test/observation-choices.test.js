import test from 'node:test';
import assert from 'node:assert/strict';
import { MemoryStorage } from './setup.js';

globalThis.localStorage = new MemoryStorage();
const { store, Store } = await import('../store.js');
const { toggleObservationChoice, updateSelectedEntry } = await import('../ui/modal-shared.js');
const { openBleedingModal, openCervixModal, openMucusModal, openOtherModal, openMarkersModal } = await import('../ui/observation-modals.js');

test('cleared observations remain unselected after saving and reopening; explicit negative answers survive', () => {
  const buttons = [];
  const element = () => ({ classList: { add() {}, remove() {}, contains() { return false; }, toggle() {} }, querySelectorAll() { return []; }, setAttribute() {} });
  globalThis.document = {
    getElementById: () => element(),
    querySelectorAll: selector => selector === '.segmented button' ? buttons : [],
  };
  store.reset();
  const map = store.createMap('Observations');
  const key = '2026-10-17';
  store.selectedKey = key;
  store.updateEntry(key, { other: 'Keep this note', temp: 36.5 });
  for (const [group, value, open] of [
    ['cervixFirmness', 'hard', openCervixModal],
    ['cervixHeight', 'low', openCervixModal],
    ['cervixOpenness', 'closed', openCervixModal],
    ['bleeding', 'none', openBleedingModal],
    ['sediment', false, openBleedingModal],
    ['stretch', false, openMucusModal],
    ['visible', true, openMucusModal],
    ['sensation', '', openMucusModal],
    ['consistency', 'creamy', openMucusModal],
    ['color', 'white', openMucusModal],
    ['sex', false, openOtherModal],
    ['isPeak', true, openMarkersModal],
  ]) {
    let pressed;
    buttons.splice(0, buttons.length, {
      dataset: { group, value: String(value) }, closest: () => element(),
      classList: { toggle() {} }, setAttribute: (_name, state) => { pressed = state; },
    });
    open();
    assert.equal(pressed, 'false', group);
    toggleObservationChoice(group, value);
    assert.equal(pressed, 'true', group);
    updateSelectedEntry({ [group]: store.modal[group] });
    store.save();
    assert.equal(new Store().getMap(map.id).entries[key][group], value);
    open();
    assert.equal(pressed, 'true', group);
    toggleObservationChoice(group, value);
    assert.equal(pressed, 'false', group);
    updateSelectedEntry({ [group]: store.modal[group] });
    store.save();
    assert.equal(Object.hasOwn(new Store().getMap(map.id).entries[key], group), false, group);
    open();
    assert.equal(pressed, 'false', group);
  }
  assert.equal(store.entries[key].other, 'Keep this note');
  assert.equal(store.entries[key].temp, 36.5);
});
