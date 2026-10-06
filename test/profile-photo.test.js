import test from 'node:test';
import assert from 'node:assert/strict';
import { isStoredProfilePhoto, prepareProfilePhoto, MAX_PHOTO_FILE_BYTES } from '../profile-photo.js';
import { normalizeProfile, normalizeApplicationData } from '../data-validation.js';
import { MemoryStorage } from './setup.js';
import { LocalStorageAdapter } from '../storage/local-storage-adapter.js';
import { parseBackup } from '../backup.js';

globalThis.localStorage = new MemoryStorage();
const { Store } = await import('../store.js');

const photo = 'data:image/jpeg;base64,/9j/2Q==';

test('profile photos persist in account state, map snapshots and JSON backups', () => {
  const storage = new MemoryStorage();
  const store = new Store(new LocalStorageAdapter(storage));
  store.saveProfile({ name: 'Photo test', photo });
  const map = store.createMap('Photo map');
  const restored = new Store(new LocalStorageAdapter(storage));
  assert.equal(restored.profile.photo, photo);
  assert.equal(restored.getMap(map.id).profileSnapshot.photo, photo);
  assert.equal(normalizeApplicationData(restored.getPersistentState(), { strict: true }).profile.photo, photo);
  assert.equal(parseBackup(store.createBackup()).profile.photo, photo);
  assert.equal(parseBackup(store.createMapBackup(map.id)).profile.photo, photo);
  store.saveProfile({ ...store.profile, photo: '' });
  assert.equal(new Store(new LocalStorageAdapter(storage)).profile.photo, '');
  assert.equal(normalizeProfile({ name: 'Legacy' }, { strict: true }).photo, '');
});

test('profile photos reject remote URLs, SVG, malformed and oversized data', () => {
  assert.equal(isStoredProfilePhoto(photo), true);
  for (const value of ['https://example.com/photo.jpg', 'javascript:alert(1)', 'data:image/svg+xml;base64,PHN2Zz4=',
    'data:image/jpeg;base64,broken', 'data:image/jpeg;base64,/9j/' + 'A'.repeat(60000), {}, null]) {
    assert.equal(isStoredProfilePhoto(value), false);
    assert.throws(() => normalizeProfile({ photo: value }, { strict: true }));
    assert.equal(normalizeProfile({ photo: value }).photo, '');
  }
});

test('unsupported, empty and oversized photo files fail before browser decoding', async () => {
  await assert.rejects(prepareProfilePhoto({ type: 'image/svg+xml', size: 50 }), /JPG, PNG or WebP/);
  await assert.rejects(prepareProfilePhoto({ type: 'image/jpeg', size: MAX_PHOTO_FILE_BYTES + 1 }), /10 MB/);
  await assert.rejects(prepareProfilePhoto({ type: 'image/png', size: 0 }), /10 MB/);
  await assert.rejects(prepareProfilePhoto(new Blob(['<svg></svg>'], { type: 'image/jpeg' })), /JPG, PNG or WebP/);
});
