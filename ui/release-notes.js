import { currentRelease, RELEASE_SEEN_KEY, releasePreference, isNewRelease } from '../release-notes.js';
import { translateDOM } from '../i18n.js';

export function setupReleaseNotes(app) {
  if (!app || app.querySelector('.release-notes-control')) return;
  let storage;
  try { storage = localStorage; } catch { /* In-memory acknowledgement still works. */ }
  const preference = releasePreference(storage);
  const control = document.createElement('div'); control.className = 'release-notes-control';
  control.innerHTML = `<button type="button" class="btn secondary release-notes-trigger" aria-haspopup="dialog"><span data-i18n>What's new</span><span class="release-unread-dot" aria-hidden="true"></span></button>
    <aside class="release-announcement" aria-label="New version" data-i18n-aria-label="New version">
      <strong><span data-i18n>New version</span> <span data-release-version></span></strong>
      <p data-i18n>See what changed in this update.</p>
      <div><button type="button" class="btn primary" data-release-open data-i18n>Read changes</button><button type="button" class="btn secondary" data-release-dismiss data-i18n>Dismiss</button></div>
      <a data-release-github target="_blank" rel="noopener noreferrer" data-i18n>Full release notes on GitHub</a>
    </aside>`;
  (app.querySelector('.account-bar') || app).append(control);
  const dialog = document.createElement('dialog'); dialog.className = 'release-notes-dialog';
  dialog.setAttribute('aria-labelledby', 'releaseNotesTitle');
  dialog.innerHTML = `<header><div><p class="screen-kicker"><span data-i18n>Version</span> <span data-release-version></span></p><h2 id="releaseNotesTitle" data-i18n>What's new</h2></div><button type="button" class="btn secondary" data-release-close data-i18n>Close</button></header><ul></ul><a data-release-github target="_blank" rel="noopener noreferrer" data-i18n>Full release notes on GitHub</a>`;
  for (const change of currentRelease.changes) {
    const item = document.createElement('li'); item.textContent = change; item.setAttribute('data-i18n', change);
    dialog.querySelector('ul').append(item);
  }
  app.append(dialog);
  for (const root of [control, dialog]) {
    root.querySelectorAll('[data-release-version]').forEach(node => { node.textContent = currentRelease.version; });
    root.querySelectorAll('[data-release-github]').forEach(node => { node.href = currentRelease.githubUrl; });
    translateDOM(root);
  }
  const bubble = control.querySelector('.release-announcement'), dot = control.querySelector('.release-unread-dot');
  const trigger = control.querySelector('.release-notes-trigger');
  function unread(value) { bubble.hidden = !value; dot.hidden = !value; }
  const dismiss = () => { preference.dismiss(); unread(false); };
  const open = () => { dismiss(); if (!dialog.open) dialog.showModal(); };
  trigger.onclick = open;
  control.querySelector('[data-release-open]').onclick = open;
  control.querySelector('[data-release-dismiss]').onclick = dismiss;
  control.querySelector('[data-release-github]').onclick = dismiss;
  app.addEventListener('click', event => { if (event.target.closest('.menu-changelog')) dismiss(); });
  dialog.querySelector('[data-release-close]').onclick = () => dialog.close();
  dialog.addEventListener('close', () => trigger.focus({ preventScroll: true }));
  control.addEventListener('keydown', event => { if (event.key === 'Escape') { dismiss(); trigger.focus(); } });
  window.addEventListener('storage', event => {
    if (event.key === RELEASE_SEEN_KEY && !isNewRelease(currentRelease.version, event.newValue)) unread(false);
  });
  unread(preference.isUnread());
}
