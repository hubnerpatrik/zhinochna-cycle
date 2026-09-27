import { neon } from "@neondatabase/serverless";
import { createIdentityVerifier } from "../server/identity.js";
import { createStateHandler } from "../server/state-handler.js";
import { createStateRepository } from "../server/state-repository.js";

let configuredHandler;
export default async function handler(req, res) {
  try {
    configuredHandler ||= createStateHandler({
      identify: createIdentityVerifier(process.env.VITE_NEON_AUTH_URL),
      repository: createStateRepository(neon(process.env.DATABASE_URL)),
    });
  } catch {
    res.setHeader("Cache-Control", "no-store");
    return res.status(503).json({ error: "storage_not_configured" });
  }
  return configuredHandler(req, res);
}
