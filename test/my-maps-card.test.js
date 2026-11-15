import test from 'node:test';
import assert from 'node:assert/strict';
import { MemoryStorage } from './setup.js';

globalThis.localStorage = new MemoryStorage();
const { renderMapCard } = await import('../views/my-maps.js');
const { buildMapMeta } = await import('../map-list-model.js');

const map = buildMapMeta({
  id: 'map-1', name: 'Spring', status: 'open', createdAt: '2026-03-01T00:00:00.000Z',
  entries: { '2026-03-02': { temp: 36.5 } },
  profileSnapshot: { usualMeasurementTime: '07:00', measurementMethod: 'oral', age: '30' },
});

test('a map card shows the name, one line of dates and the main actions', () => {
  const html = renderMapCard(map, 'map-1');
  assert.match(html, /Spring/);
  assert.match(html, /data-map-id="map-1"/);
  assert.match(html, /data-export-map="map-1"/);
  assert.doesNotMatch(html, /map-list-settings|map-list-preview|map-share/);
  assert.equal((html.match(/class="map-list-meta/g) ?? []).length, 1);
});

test('rename, copy and delete live in the more-actions menu', () => {
  const html = renderMapCard(map, 'map-1');
  const [, menu = ''] = html.split('class="map-more-menu"');
  for (const attribute of ['data-map-rename-id', 'data-map-copy-id', 'data-map-delete-id']) {
    assert.ok(menu.includes(`${attribute}="map-1"`), `${attribute} is inside the menu`);
    assert.equal(html.split(`${attribute}=`).length - 1, 1);
  }
});

test('a shared map names its author on the same card', () => {
  const shared = { ...map, profileSnapshotLocked: true, profileSnapshot: { name: 'Eva' } };
  assert.match(renderMapCard(shared, 'other'), /map-list-author/);
  assert.doesNotMatch(renderMapCard(map, 'other'), /map-list-author/);
});

test('deleting needs no confirmation step because the deletion can be undone', () => {
  const html = renderMapCard(map, 'map-1');
  assert.match(html, /data-map-delete-id="map-1"/);
  assert.doesNotMatch(html, /map-delete-confirmation|data-map-delete-yes|data-map-delete-no/);
});
