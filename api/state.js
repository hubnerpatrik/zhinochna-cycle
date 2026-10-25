import { HTTP_STATUS } from '../server/http.js';
import { neon } from "@neondatabase/serverless";
import { createIdentityVerifier } from "../server/identity.js";
import { createStateHandler } from "../server/state-handler.js";
import { createStateRepository } from "../server/state-repository.js";

let configuredHandler;
export default async function handler(request, response) {
  try {
    configuredHandler ||= createStateHandler({
      identify: createIdentityVerifier(process.env.VITE_NEON_AUTH_URL),
      repository: createStateRepository(neon(process.env.DATABASE_URL)),
    });
  } catch {
    response.setHeader("Cache-Control", "no-store");
    return response.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json({ error: "storage_not_configured" });
  }
  return configuredHandler(request, response);
}
