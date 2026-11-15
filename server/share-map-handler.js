import { randomUUID } from 'node:crypto';
import { parseBackup } from '../backup.js';
import { EXPORT_FIELDS, EXPORT_LABELS, observationText } from '../export-data.js';
import { escapeHtml } from '../views/view-utils.js';
import { HTTP_STATUS, hasJsonContentType, serializeRequestBody } from './http.js';
import { MAX_STATE_BYTES } from './state-handler.js';

export const MAX_ACTIVE_SHARES_PER_ACCOUNT = 20;
const SHARE_ID_PATTERN = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/;
const UNAVAILABLE = 'Share link unavailable.';

function renderSharedMap(map) {
  const rows = Object.entries(map.entries).sort(([a], [b]) => a.localeCompare(b)).map(([date, entry]) => {
    const observations = EXPORT_FIELDS.flatMap((field, index) => {
      if (field === 'temp' || entry[field] == null || entry[field] === '') return [];
      const value = observationText(field, entry[field]);
      return value && value !== '—' ? [`<li><strong>${EXPORT_LABELS[index]}</strong> ${escapeHtml(value)}</li>`] : [];
    });
    return `<tr><th scope="row">${escapeHtml(date)}</th><td>${escapeHtml(observationText('temp', entry.temp))}</td><td><ul>${observations.join('')}</ul></td></tr>`;
  });
  const title = escapeHtml(map.name || 'Shared map');
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${title}</title>
    <style>body{font:1rem system-ui;max-width:54rem;margin:2rem auto;padding:0 1rem;color:#253c32}
    table{border-collapse:collapse;width:100%;text-align:left}th,td{border-bottom:1px solid #ddd;padding:.6rem;vertical-align:top}
    tbody th{white-space:nowrap}ul{padding-left:1rem;margin:0;overflow-wrap:anywhere}</style>
    <main><h1>${title}</h1><p>Shared cycle map · Read-only copy</p>
    <table><thead><tr><th>Date</th><th>Temperature</th><th>Observations</th></tr></thead>
    <tbody>${rows.join('') || '<tr><td colspan="3">No entries</td></tr>'}</tbody></table></main></html>`;
}

// Dependencies are injected so tests run without a database, like the state and feedback handlers.
export function createShareMapHandler({ identify, repository, maxActive = MAX_ACTIVE_SHARES_PER_ACCOUNT }) {
  return async (request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader('X-Robots-Tag', 'noindex, nofollow');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    if (!['GET', 'POST'].includes(request.method)) {
      response.setHeader('Allow', 'GET, POST');
      return response.status(HTTP_STATUS.METHOD_NOT_ALLOWED).end();
    }
    try {
      if (request.method === 'GET') {
        const id = request.query?.id;
        if (typeof id !== 'string' || !SHARE_ID_PATTERN.test(id)) return response.status(HTTP_STATUS.NOT_FOUND).send(UNAVAILABLE);
        const map = await repository.read(id);
        if (!map) return response.status(HTTP_STATUS.NOT_FOUND).send(UNAVAILABLE);
        response.setHeader('Content-Type', 'text/html; charset=utf-8');
        response.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'; sandbox");
        return response.status(HTTP_STATUS.OK).send(renderSharedMap(map));
      }
      let ownerId;
      try { ownerId = await identify(request.headers.authorization); }
      catch { return response.status(HTTP_STATUS.UNAUTHORIZED).json({ error: 'unauthorized' }); }
      if (!hasJsonContentType(request)) return response.status(HTTP_STATUS.UNSUPPORTED_MEDIA_TYPE).json({ error: 'json_required' });
      const raw = serializeRequestBody(request.body);
      if (!raw || Buffer.byteLength(raw) > MAX_STATE_BYTES) return response.status(HTTP_STATUS.PAYLOAD_TOO_LARGE).json({ error: 'too_large' });
      let map;
      try {
        const maps = Object.values(parseBackup(raw).maps);
        if (maps.length !== 1) throw new Error('Expected one map');
        const { name, entries } = maps[0];
        map = { name, entries };
      } catch { return response.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'invalid_map' }); }
      const id = randomUUID();
      if (!await repository.create(ownerId, id, map, maxActive)) {
        return response.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({ error: 'share_limit_reached' });
      }
      return response.status(HTTP_STATUS.CREATED).json({ id });
    } catch {
      return response.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json({ error: 'storage_unavailable' });
    }
  };
}
