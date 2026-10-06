# Feedback and exports

The bug button opens a report inbox. Choose **Point to a problem**, select a control,
and send a comment. Open reports have numbered pins on the corresponding screen.
Each thread supports replies, resolution and reopening. On phones the inbox is a
bottom sheet. Refresh fetches the latest replies; this is not live chat.

Reports are stored separately from cycle maps. The server authenticates each request.
Users see only their own reports; configured support administrators can see and reply
to all reports. The inbox returns the latest 200 threads; each accepts up to 100
messages of 4,000 characters. Failed submissions retain the draft in memory until
the page is reloaded. Retry IDs prevent duplicate posts after a lost response.

## Deployment

1. Run `npm run db:migrate` with the existing server-only `DATABASE_URL`. This runs
   the idempotent migrations, including `002-feedback.sql`.
2. Set server-only `FEEDBACK_ADMIN_EMAILS=hiba.p@seznam.cz` in the deployment environment.
   Only verified email claims from signed Neon tokens count. If a provider omits
   email claims, use `FEEDBACK_ADMIN_IDS` with the verified account subject instead.
3. Deploy the frontend and `/api/feedback` together. Verify with an ordinary account
   and the administrator account. No administrator permission is derived from the client.

Anchors contain the screen route, a DOM selector, a control label, relative click
coordinates, viewport dimensions and app version. They deliberately omit input
values, cycle data, screenshots and URL query parameters. Comments themselves are
shared with support. Pins identify interface elements, not a particular user's map.
Controls removed by a redesign may lose their visible pin; the report remains in
the inbox. Reports are independent of map deletion.

## Exports

My Maps offers PDF, CSV and the original JSON backup. CSV is UTF-8 with BOM, comma
delimited, quoted and protected against formula injection. It uses stable English
field names and includes every recorded day's observation fields, including nested
markers as JSON values. JSON remains the format for restoring a complete map.

PDF downloads directly, with landscape A4 temperature charts and complete daily
observations on subsequent pages. Chart pages show up to 28 calendar days with gaps
for missing temperatures. Maps spanning over 730 days show recorded dates only.
Pages are rasterized at twice the PDF page resolution to preserve all supported
language glyphs without downloading fonts; PDF text is not selectable. Manual
annotations also appear in the observation appendix. Export never changes map data.
