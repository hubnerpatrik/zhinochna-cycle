// Update together with package.json when preparing a release. Keep copy user-facing.
export const currentRelease = {
  version: '0.14.0',
  githubUrl: 'https://github.com/hubnerpatrik/zhinochna-cycle/releases',
  changes: [
    'Use matching icons to record mucus, cervix and period intensity.',
    'Export maps to Excel, PDF or JSON from a floating menu.',
    'Keep unrecorded days visible between saved observations.',
    'Create maps in a dialog without leaving the current page.',
    'Describe custom influence factors and clear observations with a tap.',
    'See the map months above observations and spotting in the calendar.',
    'Rename maps in a dialog and see influence factors below the selected temperature.',
    'Record higher temperatures without stretching the chart scale.',
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
