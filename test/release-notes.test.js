import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { currentRelease, isNewRelease, releasePreference, RELEASE_SEEN_KEY } from '../release-notes.js';
import { MemoryStorage } from './setup.js';

test('release bubble appears once per new version and never reappears on downgrade', () => {
  const storage = new MemoryStorage();
  const first = releasePreference(storage); assert.equal(first.isUnread(), true); first.dismiss();
  assert.equal(first.isUnread(), false);
  assert.equal(releasePreference(storage).isUnread(), false);
  assert.equal(releasePreference(storage, { version: '0.13.0' }).isUnread(), true);
  storage.setItem(RELEASE_SEEN_KEY, '0.13.0');
  const older = releasePreference(storage); assert.equal(older.isUnread(), false); older.dismiss();
  assert.equal(storage.getItem(RELEASE_SEEN_KEY), '0.13.0');
  assert.equal(isNewRelease('0.12.0', '0.9.0'), true);
  assert.equal(isNewRelease('0.12.0', 'invalid'), true);
});
test('release storage failures do not block the app or prevent dismissing for this session', () => {
  const preference = releasePreference({ getItem() { throw Error(); }, setItem() { throw Error(); } });
  assert.equal(preference.isUnread(), true); preference.dismiss(); assert.equal(preference.isUnread(), false);
});
test('user-facing release version matches package and links to the repository releases', () => {
  assert.equal(currentRelease.version, JSON.parse(readFileSync(new URL('../package.json', import.meta.url))).version);
  assert.equal(currentRelease.githubUrl, 'https://github.com/hubnerpatrik/zhinochna-cycle/releases');
});
