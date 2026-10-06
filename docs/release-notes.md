# New-version announcements and form feedback

The account bar includes **What's new**. On the first visit to a new version, a
small bubble offers the release summary and a GitHub Releases link. Opening the
summary, opening the linked notes, or dismissing the bubble immediately records
that version as seen. It stays dismissed across navigation, reloads and subsequent
visits in this browser. Other open tabs also receive the acknowledgement. Visiting
an older deployed version does not reset the acknowledgement of a newer version.

The main menu has a permanent **Changelog** link to
https://github.com/hubnerpatrik/zhinochna-cycle/releases. It opens a new tab.
The short in-app summary can always be reopened through **What's new**.

Acknowledgements use local browser storage, not cycle records. Clearing site data,
using a different browser/device, or blocking storage can cause the bubble to
appear again. It announces the version the browser has loaded; it does not poll
GitHub or interrupt an open editing session to force an update.

When preparing a release, update `package.json`, the root version in
`package-lock.json`, and `currentRelease` in `release-notes.js`. Add translations
for the summary in `i18n/form-feedback.js`, update `CHANGELOG.md`, and publish the
GitHub release through the normal release workflow. The in-app summary is bundled
with the application; no release has been published automatically.

Form errors are handled centrally by `ui/field-errors.js`. Native validation,
whitespace-only required text, mismatched passwords, temperature validation, and
recognized server authentication errors show a message beside the field, a red
border and a brief shake. Correcting the input clears its error. Error text is
linked through `aria-describedby` and invalid fields use `aria-invalid`. Reduced
motion disables shaking. Network or server failures are not misrepresented as
invalid input. Password values are never trimmed or written to browser storage.
