# CLAUDE.md

Guidance for Claude Code in this repository. The user communicates in Czech — reply in Czech; code, comments, commits and docs stay in English.

## Project

Cycle Tracker: browser app for symptothermal cycle observations (calendar + Canvas temperature chart, PDF/XLSX/JSON export, import). Educational tool only — never add medical advice, contraception guidance or automated fertility assessment.

- Frontend: vanilla JavaScript ES modules (no framework), Vite, HTML Canvas, plain CSS. Entry: `index.html` → `bootstrap.js` → `app.js` (`startApplication`).
- Backend: Vercel serverless functions in `api/` (thin wrappers) with logic in `server/` (handlers take injected dependencies so tests run without a database).
- Data/auth: Neon Postgres (`cycle_private` schema, `migrations/*.sql`) and Neon Auth JWTs verified in `server/identity.js`.

## Commands

```bash
npm run check   # lint (syntax check) + tests + vite build — run before every commit
npm test        # node --test test/*.test.js
npm run dev     # Vite; set VITE_DEV_AUTH_BYPASS=true in .env.development.local for local UI without sign-in
npx vercel dev  # full stack with API (needs .env with DATABASE_URL, VITE_NEON_AUTH_URL)
npm run db:migrate
```

Node ≥ 20.19 (`.nvmrc`). If `node` is not on PATH, say so instead of silently skipping checks.

## Architecture notes

- `store.js` — singleton `Store` holding UI state and the active map; `store.entries` is the active map's day records.
- `router.js` — screens and map pages with browser history; `app.js` `render()` re-renders the active map; `renderZoom()` changes geometry only.
- `active-map/` — chart interactions, gestures, mobile calendar/graph switching. `ui/` — modals and rendering pieces. `views/` — standalone screens.
- Persistence: `storage/local-storage-adapter.js` (per-account cache + upload queue) and `storage/cloud-storage-adapter.js`. Server stores the whole account state as one JSONB document (max 2 MB) with version compare-and-swap and idempotent `mutation_id` (`server/state-repository.js`). Do not break this conflict model.
- `data-validation.js` normalizes all stored/imported data; `backup.js` handles the embedded JSON backup used by imports and exports.
- i18n: English source strings are the keys. `t()` in `i18n.js` looks up `messages[key]` as `[cs, sk, uk]` from `i18n/*.js`. Every new user-visible string needs Czech, Slovak and Ukrainian translations.

## Conventions

- Branches: work on `develop`; release by PR `develop → main`. No other branches for routine work. Don't commit or push unless asked.
- Commits: Conventional Commit subjects (`feat:`, `fix:`, `docs:`, `test:`, `chore:`), imperative, short.
- Record user-visible changes under `## Unreleased` in `CHANGELOG.md`.
- Releases (see `CONTRIBUTING.md`, `docs/release-notes.md`): bump `package.json` + `package-lock.json`, `currentRelease` in `release-notes.js` (with translations in `i18n/form-feedback.js`), changelog section, tag `vX.Y.Z` on `main`.
- Style: 2-space indent, LF, ES modules. No inline style writes from JS — toggle CSS classes (`ui/layout-classes.js`). Escape any user text inserted as HTML (`escapeHtml` in `views/view-utils.js`).
- Add or update tests in `test/` for behavior changes; `test/setup.js` provides `MemoryStorage`.
- Mobile matters: check layouts at narrow widths (~320–390 px) as well as desktop.
- Never commit secrets or personal data; `.env*` files are ignored except `.env.example`. `work/` is a local scratch area (ignored).
