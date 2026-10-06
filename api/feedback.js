import { neon } from '@neondatabase/serverless';
import { createIdentityVerifier } from '../server/identity.js';
import { createFeedbackHandler } from '../server/feedback-handler.js';
import { createFeedbackRepository } from '../server/feedback-repository.js';
let configured;
export default async function handler(req, res) {
  try {
    configured ||= createFeedbackHandler({
      identify: createIdentityVerifier(process.env.VITE_NEON_AUTH_URL, undefined, { includeEmail: true }),
      repository: createFeedbackRepository(neon(process.env.DATABASE_URL)),
      adminIds: (process.env.FEEDBACK_ADMIN_IDS || '').split(',').map(value => value.trim()).filter(Boolean),
      adminEmails: (process.env.FEEDBACK_ADMIN_EMAILS || '').split(',').map(value => value.trim().toLowerCase()).filter(Boolean),
    });
  } catch {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(503).json({ error: 'storage_not_configured' });
  }
  return configured(req, res);
}
