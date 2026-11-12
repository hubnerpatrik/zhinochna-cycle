// Update together with package.json when preparing a release. Keep copy user-facing.
export const currentRelease = {
  version: '0.18.0',
  githubUrl: 'https://github.com/hubnerpatrik/zhinochna-cycle/releases',
  changes: [
    "Measurement time, method, goal and age now belong to each map. Set them when creating a map and change them with Edit.",
    "Copy maps and filter My Maps by your own, shared, open or closed maps.",
    "Switch days directly in Edit Day, drag across days to mark fertile days, and keep Markers on for several days.",
    "Calendar dots show influence factors, sex and symptoms, and dates are written out in your language.",
  ],
};
export const RELEASE_SEEN_KEY = 'cycle-release-notes-seen';
const VERSION_COMPONENT_COUNT = 3;
export function isNewRelease(version, seen) {
  if (!/^\d+\.\d+\.\d+$/.test(seen || '')) return true;
  const current = version.split('.').map(Number), previous = seen.split('.').map(Number);
  for (let index = 0; index < VERSION_COMPONENT_COUNT; index++) {
    if (current[index] !== previous[index]) return current[index] > previous[index];
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
