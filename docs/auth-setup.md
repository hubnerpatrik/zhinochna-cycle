# Neon Auth setup

The app uses Neon Auth's managed Better Auth service with its vanilla JavaScript SDK.
It supports email/password registration, email verification, sign-in, sign-out, and password reset.
Only a verified, unexpired session opens the tracker. The app fails closed if auth is not configured
or a session cannot be checked. Passwords and session tokens are not stored by application code.

Browser requests use the same-origin `/api/auth/*` proxy on Vercel. The server forwards only
the supported email/password endpoints to `VITE_NEON_AUTH_URL` and returns host-only,
HttpOnly, Secure, SameSite=Lax cookies without Partitioned. This avoids depending on
third-party cookies in Safari. Session checks still go to Neon; no server session cache or
additional signing secret is used. POST requests require the app origin and JSON bodies.
Deploy frontend, API handler and `vercel.json` together. Existing users may need to sign in
once again because their previous cookies belong to the Neon domain.

## Local configuration

Set the public `VITE_NEON_AUTH_URL` in `.env.local` (and `.env` when using Vercel CLI).
Set the server-only `DATABASE_URL` in `.env` for the data API. `.env.example` shows the format.
The Vite prefix is correct for the public Auth URL and must never be used for the database password.
All actual `.env` files are ignored by Git.

In the Neon Console, enable email/password sign-in, require email verification, and configure
the email provider for verification and password-reset delivery. Allow localhost for development.
Email verification uses the Email OTP plugin: enter the code in the app's Verify your email form.
Resending explicitly requests an `email-verification` OTP, not a sign-in or password-reset code.
Codes are kept only in the form and sent to Neon for validation. Password reset still uses an email link.
Run `npm run db:migrate`, then start with `npx vercel dev` and open the root app URL.
Plain Vite serves the UI only; authentication and cloud storage require the Vercel API routes.
Use an HTTPS preview for real Safari cookie testing because auth cookies are Secure.

## Vercel deployment

Add `VITE_NEON_AUTH_URL` and `DATABASE_URL` to the appropriate Vercel environments and redeploy.
Use a separate Neon branch for development/preview and its matching Auth URL.
Add the actual application origin (for example `https://your-app.example`) to Auth's trusted domains.
Auth callbacks return to the same origin as the app; password-reset callbacks use
`/?auth=reset-password`. Reset tokens are removed from the address bar and held only in memory.
Refreshing the reset form requires reopening the email link.

## Storage and current scope

Profiles and maps sync through `/api/state` to Neon Postgres. Each verified account uses its
own `cycle-account:<encoded-user-id>:` localStorage namespace for the cache and upload queue. Pre-account `profile`, `maps`,
`activeMapId`, and `cycleData` keys are preserved and are never automatically claimed by an account.
An explicit migration flow for those older maps remains to be implemented.

These namespaces prevent accidental mixing in the UI. Browser storage is accessible to someone
with access to the same browser profile; it is not a substitute for server authorization.
The API independently validates the JWT signature, issuer, audience, expiry and verified-email claim,
derives the user ID on the server, and enforces ownership on every operation. The database-owner
connection remains server-only. See [cloud storage](cloud-storage.md) for sync and recovery behavior.

## Verification before public release

Run `npm run check`. Automated tests cover session eligibility, provider errors, callback construction,
and account storage isolation/rollback. In the actual configured Neon environment, use test accounts
to verify registration, delivered verification email, login, reload, logout, password-reset email,
and a second account. Email delivery and valid-account login need this manual end-to-end check.
Run `node --env-file=.env scripts/check-cloud-db.js` to verify database persistence, isolation and
concurrent saves using temporary synthetic records. Before release, test authenticated API access
with two real test accounts and across two devices, including browser cookie restrictions.

Reference: https://neon.com/docs/auth/overview

## Safari sign-in troubleshooting

Deploy the same-origin auth fix before asking users to clear website data. A sign-in
that returns to the form without an error on the old build can mean the following
session request found no usable session. This symptom alone does not prove cookies
are the cause. Clearing old data cannot fix a browser policy that blocks required cookies.

Before clearing anything, confirm that the latest maps are visible on another device
or download a backup from the affected device if accessible. Safari website data includes
the app's local map cache and pending upload queue, not just login cookies. Clearing it
does not delete the cloud account, but unsynced local changes can be lost.

1. Close the app's Safari tabs.
2. Open Settings > Apps > Safari > Advanced > Website Data. On older iOS versions,
   Safari is directly under Settings.
3. Find the exact app domain and delete only that entry (swipe left, or use Edit).
   Avoid Remove All Website Data, which also signs the user out of unrelated sites.
4. Under Safari > Advanced, check that Block All Cookies is off. The same-origin fix
   does not require disabling Prevent Cross-Site Tracking.
5. Open the app's normal HTTPS address directly in a new Safari tab and sign in again.

If sign-in still fails, record the exact message, iOS version, and whether the same
phone behaves differently on Wi-Fi and mobile data. Do not collect passwords or tokens.

Apple reference: https://support.apple.com/105082
