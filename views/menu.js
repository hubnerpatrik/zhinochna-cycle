import { currentRelease } from '../release-notes.js';
import { homeMarkup } from './home.js';

// The signed-in menu screen is the home page: an introduction to the app, not a set of shortcuts.
// The header and the phone tab bar navigate; translation happens through the i18n DOM observer.
export function renderMenuView(container) {
  container.innerHTML = homeMarkup({
    variant: 'member',
    version: currentRelease.version,
    changelogUrl: currentRelease.githubUrl,
  });
}
