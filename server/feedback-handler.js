import { validateFeedback } from '../feedback-model.js';

export function createFeedbackHandler({ identify, repository, adminIds = [], adminEmails = [] }) {
  return async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Vary', 'Authorization');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (!['GET', 'POST'].includes(req.method)) {
      res.setHeader('Allow', 'GET, POST');
      return res.status(405).json({ error: 'method_not_allowed' });
    }
    let identity;
    try { identity = await identify(req.headers.authorization); }
    catch { return res.status(401).json({ error: 'unauthorized' }); }
    const userId = typeof identity === 'string' ? identity : identity.userId;
    const admin = adminIds.includes(userId) || (Boolean(identity.email) && adminEmails.includes(identity.email));
    if (req.method === 'GET') {
      try { return res.status(200).json({ admin, threads: await repository.list(userId, admin) }); }
      catch { return res.status(503).json({ error: 'storage_unavailable' }); }
    }
    if (!/^application\/json(?:;|$)/i.test(req.headers['content-type'] || '')) return res.status(415).json({ error: 'json_required' });
    let input;
    try {
      const raw = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      if (!raw || Buffer.byteLength(raw) > 24000) return res.status(413).json({ error: 'too_large' });
      input = validateFeedback(JSON.parse(raw));
    } catch { return res.status(400).json({ error: 'invalid_feedback' }); }
    if (input.action === 'resolve' && !admin) return res.status(403).json({ error: 'admin_required' });
    try {
      const result = await repository.write(userId, admin, input);
      return result ? res.status(200).json({ thread: result }) : res.status(404).json({ error: 'not_found_or_full' });
    } catch { return res.status(503).json({ error: 'storage_unavailable' }); }
  };
}
