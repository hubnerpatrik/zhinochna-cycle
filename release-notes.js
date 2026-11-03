// Update together with package.json when preparing a release. Keep copy user-facing.
export const currentRelease = {
  version: '0.16.0',
  githubUrl: 'https://github.com/hubnerpatrik/zhinochna-cycle/releases',
  changes: [
    "Share a map from My Maps using the link icon. Anyone with the link can view a read-only copy of the observations for seven days without signing in.",
    "Sign-in opens your active map, with the calendar first on mobile. The main menu is still available from navigation.",
    "After saving a new profile, go straight to My Maps. Your first map opens with a day selected so you can start recording.",
    "On mobile, expand Day info above Edit day and Tools to review the selected day’s observations.",
    "Tap a selected tile again to clear it. Mucus tiles fill each row, and the Sex and Other tiles match that style. Selecting Other opens a notes field.",
    "Mark observations with the new ↑ and ↓ symbols.",
    "Import is highlighted and Export uses a download icon. PDF cards show adjusted temperature in blue. Excel and JSON stay visible as disabled options.",
    "Only the designated administrator sees numbered feedback pins. Main menu buttons have simpler labels.",
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
