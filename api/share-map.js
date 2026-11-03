import { randomUUID } from 'node:crypto';
import { neon } from '@neondatabase/serverless';
import { parseBackup } from '../backup.js';
import { createIdentityVerifier } from '../server/identity.js';
import { EXPORT_FIELDS, EXPORT_LABELS, observationText } from '../export-data.js';
import { escapeHtml } from '../views/view-utils.js';

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

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (!['GET', 'POST'].includes(req.method)) {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).end();
  }
  try {
    const sql = neon(process.env.DATABASE_URL);
    if (req.method === 'GET') {
      const id = req.query?.id;
      if (typeof id !== 'string' || !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(id)) return res.status(404).send('Share link unavailable.');
      const [row] = await sql`SELECT map FROM cycle_private.shared_maps WHERE id = ${id}::uuid AND expires_at > now()`;
      if (!row) return res.status(404).send('Share link unavailable.');
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'; sandbox");
      return res.status(200).send(renderSharedMap(row.map));
    }
    const identify = createIdentityVerifier(process.env.VITE_NEON_AUTH_URL);
    try { await identify(req.headers.authorization); }
    catch { return res.status(401).json({ error: 'unauthorized' }); }
    if (!/^application\/json(?:;|$)/i.test(req.headers['content-type'] || '')) return res.status(415).json({ error: 'json_required' });
    const raw = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    if (!raw || Buffer.byteLength(raw) > 2_000_000) return res.status(413).json({ error: 'too_large' });
    let map;
    try {
      const maps = Object.values(parseBackup(raw).maps);
      if (maps.length !== 1) throw new Error('Expected one map');
      const { name, entries } = maps[0];
      map = { name, entries };
    } catch { return res.status(400).json({ error: 'invalid_map' }); }
    const id = randomUUID();
    await sql.transaction([
      sql`DELETE FROM cycle_private.shared_maps WHERE expires_at <= now()`,
      sql`INSERT INTO cycle_private.shared_maps (id, map) VALUES (${id}::uuid, ${JSON.stringify(map)}::jsonb)`,
    ]);
    return res.status(201).json({ id });
  } catch {
    return res.status(503).json({ error: 'storage_unavailable' });
  }
}
