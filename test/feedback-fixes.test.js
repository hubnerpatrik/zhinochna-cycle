import test from 'node:test';
import assert from 'node:assert/strict';
import { MemoryStorage } from './setup.js';
globalThis.localStorage = new MemoryStorage();
const { store, Store } = await import('../store.js');
const { visibleObservationRows } = await import('../ui/map-grid.js');
const { toggleObservationChoice } = await import('../ui/modal-shared.js');
const { parseBackup } = await import('../backup.js');
const { setLanguage, t } = await import('../i18n.js');

test('optional observation groups depend on the entire map, including explicit negatives and cervix markers', () => {
  assert.deepEqual(visibleObservationRows({ '2026-10-01': { temp: 36.5 } }), { cervix: false, symptoms: false });
  assert.deepEqual(visibleObservationRows({ a: { temp: 36.5 }, b: { cervixHeight: 'low', sex: false } }), { cervix: true, symptoms: true });
  assert.equal(visibleObservationRows({ a: { markers: { cervix: { value: 'P' } } } }).cervix, true);
  assert.equal(visibleObservationRows({ a: { other: '  ' } }).symptoms, false);
});

test('intensity and custom factors survive save/reload and strict JSON backup import', () => {
  globalThis.document = { querySelectorAll: () => [] };
  store.reset();
  const map = store.createMap('Intensity');
  store.updateEntry('2026-10-17', { bleeding: 'menstruation', bleedingIntensity: 'heavy', tempFactors: 'other', tempFactorsOther: 'Žluťoučký & <text>' });
  store.save();
  const reloaded = new Store().getMap(map.id).entries['2026-10-17'];
  assert.equal(reloaded.bleedingIntensity, 'heavy');
  assert.equal(reloaded.tempFactorsOther, 'Žluťoučký & <text>');
  const restored = parseBackup(store.createMapBackup(map.id)).maps[map.id].entries['2026-10-17'];
  assert.equal(restored.bleedingIntensity, 'heavy');
  assert.equal(restored.tempFactorsOther, reloaded.tempFactorsOther);
  toggleObservationChoice('bleedingIntensity', 'spotting');
  assert.equal(store.modal.bleeding, 'spotting');
  toggleObservationChoice('bleedingIntensity', 'spotting');
  assert.equal(store.modal.bleeding, undefined);
});

test('feedback Ukrainian terminology uses the requested words', () => {
  setLanguage('uk');
  for (const [key, expected] of [
    ['Usual measurement time', 'Стандартний час вимірювання'], ['Measurement method', 'Спосіб вимірювання'],
    ['Influence factors', 'Фактори впливу'], ['Bleeding', 'Менструація'], ['Spotting', 'Кровомазання'],
    ['Present', 'Є'], ['Slightly stretchy', 'Мало тягучий'], ['Low', 'Низько'], ['Middle', 'Посередині'], ['High', 'Високо'],
  ]) assert.equal(t(key), expected);
  assert.equal(t('Medium'), 'Середня'); // Openness uses a different grammatical form.
  setLanguage('en');
});
