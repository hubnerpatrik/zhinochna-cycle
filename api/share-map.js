import { HTTP_STATUS } from '../server/http.js';
import { neon } from '@neondatabase/serverless';
import { createIdentityVerifier } from '../server/identity.js';
import { createShareMapHandler } from '../server/share-map-handler.js';
import { createShareMapRepository } from '../server/share-map-repository.js';

let verifier;
let configuredHandler;
export default async function handler(request, response) {
  try {
    configuredHandler ||= createShareMapHandler({
      // Reading a share link needs no sign-in, so auth configuration is resolved on first use.
      identify: authorization => (verifier ||= createIdentityVerifier(process.env.VITE_NEON_AUTH_URL))(authorization),
      repository: createShareMapRepository(neon(process.env.DATABASE_URL)),
    });
  } catch {
    response.setHeader('Cache-Control', 'no-store');
    return response.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json({ error: 'storage_not_configured' });
  }
  return configuredHandler(request, response);
}
