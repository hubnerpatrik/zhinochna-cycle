import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { currentRelease, isNewRelease, releasePreference, RELEASE_SEEN_KEY } from '../release-notes.js';
import { MemoryStorage } from './setup.js';
import { messages } from '../i18n/catalog.js';

test('release bubble appears once per new version and never reappears on downgrade', () => {
  const storage = new MemoryStorage();
  const release = { version: '0.13.0' };
  const first = releasePreference(storage, release); assert.equal(first.isUnread(), true); first.dismiss();
  assert.equal(first.isUnread(), false);
  assert.equal(releasePreference(storage, release).isUnread(), false);
  assert.equal(releasePreference(storage, { version: '0.14.0' }).isUnread(), true);
  storage.setItem(RELEASE_SEEN_KEY, '0.14.0');
  const older = releasePreference(storage, release); assert.equal(older.isUnread(), false); older.dismiss();
  assert.equal(storage.getItem(RELEASE_SEEN_KEY), '0.14.0');
  assert.equal(isNewRelease('0.12.0', '0.9.0'), true);
  assert.equal(isNewRelease('0.12.0', 'invalid'), true);
});
test('release storage failures do not block the app or prevent dismissing for this session', () => {
  const preference = releasePreference({ getItem() { throw Error(); }, setItem() { throw Error(); } });
  assert.equal(preference.isUnread(), true); preference.dismiss(); assert.equal(preference.isUnread(), false);
});
test('user-facing release version matches package and links to the repository releases', () => {
  assert.equal(currentRelease.version, JSON.parse(readFileSync(new URL('../package.json', import.meta.url))).version);
  const lock = JSON.parse(readFileSync(new URL('../package-lock.json', import.meta.url)));
  assert.equal(currentRelease.version, lock.version);
  assert.equal(currentRelease.version, lock.packages[''].version);
  const changelog = readFileSync(new URL('../CHANGELOG.md', import.meta.url), 'utf8');
  assert.equal(changelog.split('\n').filter(line => line.startsWith(`## ${currentRelease.version} — `)).length, 1);
  for (const change of currentRelease.changes) assert.equal(messages[change]?.filter(Boolean).length, 3, change);
  assert.equal(currentRelease.githubUrl, 'https://github.com/hubnerpatrik/zhinochna-cycle/releases');
});
