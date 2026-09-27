# Cloud storage

Run `npm run db:migrate` with the target database's `DATABASE_URL` in `.env`. This creates
`cycle_private.account_state`, leaving existing data intact. Repeat per Neon branch/environment.
Run the app using `npx vercel dev`; Vite alone does not serve `/api/state`.

## Authorization and database access

The client obtains a short-lived JWT using Neon Auth's `token()` method and sends it only in
the Authorization header to the same-origin API. Application code does not persist JWTs.
The API uses `jose` and a cached JWKS from the configured Auth URL. It requires EdDSA,
the Auth origin as issuer and audience, subject, issued-at, expiry, verified email, and no ban.
Every query uses that verified subject. Request bodies cannot specify an owner.
The database password is never included in the browser bundle.

The private schema has no PUBLIC privileges; row-level security is enabled without client-facing
policies. The trusted backend connects as the table owner, which bypasses RLS, and enforces user
ownership in parameterized queries. Do not expose that connection to clients or add public policies.
JWTs already issued can remain valid until expiry (normally 15 minutes), even after sign-out.

## Synchronization

One JSON document per account contains the profile, maps and active map ID. Requests are limited
to 2 MiB. A save atomically records the latest state in a namespaced localStorage envelope, then
uploads after a short debounce. The UI shows a cloud confirmation only after acknowledgement.
A durable mutation ID makes retries safe when the server committed but its response was lost.
Edits made during an upload are queued behind it. Failed uploads retry on reconnect and every
45 seconds while the signed-in app is visible. Startup requires auth verification; this is not a
fully offline sign-in/PWA implementation. Cache copies stay in the browser after sign-out.

On sign-in/reload, a clean local cache is replaced with cloud state. Existing local data assigned
to that same account is uploaded when cloud storage is empty. Unassigned pre-account data is left
untouched. A server version check prevents stale devices from overwriting newer changes, including
concurrent creates/deletes. No automatic merging of health records is attempted.

When cloud data changes on another device, the app blocks edits and offers a download of local
data followed by loading the cloud version. The local envelope is additionally retained under a
`:recovery:<random-id>` key before the switch. Backups can be imported using the existing map import
workflow. A same-browser tab change also blocks stale writes; reload picks up the shared local queue.
Pending local edits can only reach other devices once their upload succeeds.

## Validation

`npm run check` covers authorization, input validation, cache failures, conflicts and lost responses.
`node --env-file=.env scripts/check-cloud-db.js` uses two random synthetic IDs to verify real SQL
isolation, idempotent retries and concurrent writes, then removes only those fixtures.
For end-to-end validation, sign in, create a test map, wait for “Saved to your account”, reload,
and open the same account in another browser/device. A different account must not see the map.

Reference: [Neon Auth JWT](https://neon.com/docs/auth/guides/plugins/jwt).
