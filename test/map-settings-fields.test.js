import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MemoryStorage } from './setup.js';

globalThis.localStorage = new MemoryStorage();
const { renderMapSettingsFields } = await import('../views/map-settings-fields.js');
const { profileInfoRows } = await import('../ui/profile-info-modal.js');
const { normalizeProfile } = await import('../data-validation.js');
const { messages } = await import('../i18n/catalog.js');

test('map settings collect time, method and age only', () => {
  const html = renderMapSettingsFields({ goal: 'avoid', age: '30' });
  for (const name of ['usualMeasurementTime', 'measurementMethod', 'age']) assert.match(html, new RegExp(`name="${name}"`));
  assert.doesNotMatch(html, /name="goal"/);
});

test('profile details do not list a goal and old goal values are dropped on load', () => {
  assert.equal(profileInfoRows({ goal: 'avoid' }).some(([label]) => label === 'Goal'), false);
  assert.equal('goal' in normalizeProfile({ name: 'Eva', goal: 'avoid' }, { strict: true }), false);
});

test('active map details are labelled Map info in every language', () => {
  assert.equal(messages['Map info'].length, 3);
  assert.match(readFileSync(new URL('../index.html', import.meta.url), 'utf8'), /id="mobileProfileBtn"[^>]*>Map info</);
  assert.match(readFileSync(new URL('../ui/map-grid.js', import.meta.url), 'utf8'), /profile-info-title" data-i18n>Map info</);
  assert.match(readFileSync(new URL('../ui/profile-info-modal.js', import.meta.url), 'utf8'), /id="profileDetailsTitle" data-i18n>Map info</);
});
