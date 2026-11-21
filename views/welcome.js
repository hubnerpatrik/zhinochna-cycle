import { currentRelease } from '../release-notes.js';
import { mountLanguagePicker, translateDOM } from '../i18n.js';
import { homeMarkup } from './home.js';

// The public welcome page shown before sign-in: the home page with sign-in and sign-up actions.
export function renderWelcomeView(root, { onMode }) {
  root.innerHTML = homeMarkup({
    variant: 'public',
    version: currentRelease.version,
    changelogUrl: currentRelease.githubUrl,
  });
  translateDOM(root);
  mountLanguagePicker(root.querySelector('.language-picker'));
  root.querySelectorAll('[data-auth-mode]').forEach(button => {
    button.onclick = () => onMode(button.dataset.authMode);
  });
}
