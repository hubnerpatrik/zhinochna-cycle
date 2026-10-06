// Update together with package.json when preparing a release. Keep copy user-facing.
export const currentRelease = {
  version: '0.12.1',
  githubUrl: 'https://github.com/hubnerpatrik/zhinochna-cycle/releases',
  changes: [
    'Feedback actions now have distinct colors.',
    'Add or remove a profile photo in JPG, PNG or WebP format.',
    'On phones, day editing buttons appear before the saved observations.',
  ],
};
export const RELEASE_SEEN_KEY = 'cycle-release-notes-seen';
export function isNewRelease(version, seen) {
  if (!/^\d+\.\d+\.\d+$/.test(seen || '')) return true;
  const current = version.split('.').map(Number), previous = seen.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if (current[i] !== previous[i]) return current[i] > previous[i];
  }
  return false;
}
export function releasePreference(storage, release = currentRelease) {
  let seen;
  try { seen = storage?.getItem(RELEASE_SEEN_KEY); } catch { /* Storage can be blocked. */ }
  return {
    isUnread: () => isNewRelease(release.version, seen),
    dismiss() {
      if (isNewRelease(release.version, seen)) seen = release.version;
      try { storage?.setItem(RELEASE_SEEN_KEY, seen); } catch { /* Still dismiss for this session. */ }
    },
  };
}
