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
