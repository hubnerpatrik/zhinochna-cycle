# Frontend refactor audit — 2026-10-23

The review covers application startup and routing, map and profile views, chart interactions,
UI dialogs, feedback, browser persistence, exports, image processing and shared frontend utilities.
Server endpoints, database schema and third-party dependencies are outside this frontend refactor.

## Final findings addressed

- `map-list-model.js` holds pure map summary and filtering functions; `views/my-maps.js` renders and binds controls.
- `feedback-transport.js` handles authentication, payload validation and HTTP independently of dialog state.
- Feedback rendering and event binding are separate functions. Validation and UI share existing message and anchor limits.
- `browser-download.js` centralizes Blob downloads. Existing callers retain their original URL lifetimes
  (0, 1,000 or 60,000 ms) and whether the download link is attached to the document.
- `form-limits.js` names the existing browser constraints; no additional validation rules were introduced.
- Navigation ownership, feedback escaping and release-notification helpers have descriptive names.

## Deliberately retained

- Sequential loops with early termination, asynchronous page generation, calendar traversal and floating-point stepping.
- Mathematical coordinates, SVG path data, protocol structure, translations and CSS values.
- Existing fallback behavior, authentication flow, storage rollback and synchronization ordering.
- Public module exports, including the `downloadFile` re-export from `map-export.js`.

## Validation

- JavaScript syntax checks, all 168 automated tests, and the production Vite build pass.
- No direct inline-style writes were found in application JavaScript.
- Local Edge comparison against commit `685b4e9` covers 320/390/1365 px layouts, zoom,
  export menus, profile photo, time picker, map filters, feedback list/thread/draft and six authentication forms.
  Generated map IDs are normalized for HTML comparison; external fonts are blocked identically in both runs.
- CSV, XLSX, PDF and processed-image hashes match on the comparison fixtures.
- HTTP feedback tests use a mocked transport; no live account or production submission is exercised.

These checks cover the listed scenarios, not every possible user interaction or input.

## Follow-up project refactor — 2026-10-23

Baseline: `f26e32c`. This pass extends the frontend audit above to server handlers,
identity verification, feedback persistence and the remaining binary export assembly.
The project uses native JavaScript modules; no React dependency is present.

### Changes

- `server/http.js` centralizes HTTP status constants, private response headers,
  JSON content-type checks and request-body serialization shared by state and feedback.
  Auth retains its own content-type rule, headers and empty-body fallback.
- `server/state-input.js` separates state normalization from HTTP and repository operations.
  The existing version ceiling and permissive mutation-ID pattern remain unchanged.
- Auth helpers separate origin checks and cookie conversion. Payload, token, name,
  database-query and timeout limits have descriptive constants; API parameters use
  `request` and `response` throughout.
- Feedback persistence separates author lookup, public message projection and message
  creation. Query limits are bound parameters with the same existing values.
- `ui/feedback-view.js` produces the existing HTML independently of dialog state and
  event binding. Thread navigation shares its existing reply-reset sequence.
- `xlsx-export.js` handles workbook XML; `zip-archive.js` handles ZIP headers and CRC.
  `pdf-document.js` handles PDF objects and byte offsets independently of canvas drawing.
  Both archive writers use `binary-utils.js` to concatenate byte chunks.

### Verification for this pass

- Syntax check, all **171 tests**, and the production Vite build passed. `npm` is
  unavailable in this shell, so the same checks ran through Node directly:
  `node scripts/check-js.js`, `node --test --test-reporter=dot test/*.test.js`, and
  the Vite `build()` API with default project configuration.
- A differential comparison loaded baseline modules from Git and compared them with
  the working tree: 6 workbook fixtures and 8 PDF fixtures produced identical bytes;
  138 feedback validation cases produced identical results or error messages.
- The original feedback template and extracted renderer produced identical HTML in
  384 scenarios across English, Czech and Ukrainian, including list/draft/thread/empty
  views and combinations of admin, saving, loading, image-processing and error states.
- New regression tests cover feedback escaping, admin-only resolution controls,
  pending-image submission blocking and state-input boundaries.
- No direct inline-style writes or HTML style attributes were found in application
  JavaScript/HTML. Existing stylesheet-class layout handling remains in place.
- No production database, live auth provider or live feedback submission was used.
  Database assertions use injected repositories/SQL mocks; browser visuals were not
  rechecked in this pass. The HTML and binary comparisons cover the fixtures above.

## Final preview verification — 2026-10-25

Code baseline: `7b2e0a2` on `develop`. These checks extend the earlier mocked
checks to the isolated Cycle App Preview Neon project and the stable Vercel
develop preview. They do not exercise the production database or deployment.

- JavaScript syntax checks, all 171 automated tests and the production Vite build
  passed again. `git diff --check` passed. No direct inline-style writes were found
  in application JavaScript/HTML.
- The live test exposed a protected-preview compatibility issue: cloud and feedback
  requests used `credentials: omit`, excluding the Vercel protection cookie.
  Commit `7b2e0a2` uses `same-origin` for these relative API requests. Server handlers
  still authorize accounts through verified JWTs, not cookies. Vercel protection
  and production settings were not changed.
- Email verification, password sign-in and session restoration were exercised with
  the user-created test account. Its verified session opened the tracker after reload.
- Created a separate map named `TEST final 25.10.2026`, saved a synthetic temperature
  of 36.65 and a Czech note containing angle brackets, an ampersand and quotation
  marks. Both values survived a full page reload and rendered as plain text.
- Independently read only that test map's entry in Neon SQL Editor. It contained the
  same temperature and note in account-state version 8, confirming an actual cloud
  write rather than just browser-local persistence.
- Submitted one explicitly labelled test Feedback report without an attachment.
  The report appeared in its thread after the request completed.
- Sign-out concealed the tracker and returned to the sign-in form.
- After the user signed in again, the test map reopened with the same temperature
  and note, the existing profile was present and cloud status was saved.

### Scope and remaining checks

- The user performed password entry for the final sign-in check; no password or
  verification code is collected in the audit or repository.
- The test map and labelled Feedback report remain in the isolated preview account.
- Earlier export comparisons and local download checks remain applicable; exports
  were not downloaded again during this live cloud check.
- These checks do not cover a physical mobile device, a second live account/device,
  password reset delivery or an admin response to Feedback. They are not a guarantee
  that every input or interaction is defect-free.
- The GitHub Actions workflow runs on pull requests and pushes to `main`. The
  checks reported here were run locally; a successful Vercel build is not a CI result.
