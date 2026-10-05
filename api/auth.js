import { createAuthHandler } from "../server/auth-handler.js";

let configuredHandler;
export default async function handler(req, res) {
  try {
    configuredHandler ||= createAuthHandler({ baseUrl: process.env.VITE_NEON_AUTH_URL });
  } catch {
    res.setHeader("Cache-Control", "no-store");
    return res.status(503).json({ code: "AUTH_NOT_CONFIGURED" });
  }
  return configuredHandler(req, res);
}
