import { HTTP_STATUS } from '../server/http.js';
import { createAuthHandler } from "../server/auth-handler.js";

let configuredHandler;
export default async function handler(request, response) {
  try {
    configuredHandler ||= createAuthHandler({ baseUrl: process.env.VITE_NEON_AUTH_URL });
  } catch {
    response.setHeader("Cache-Control", "no-store");
    return response.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json({ code: "AUTH_NOT_CONFIGURED" });
  }
  return configuredHandler(request, response);
}
