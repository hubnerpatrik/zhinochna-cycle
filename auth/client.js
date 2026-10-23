import { createAuthClient } from "@neondatabase/auth";
import { BetterAuthVanillaAdapter } from "@neondatabase/auth/vanilla";
import { AUTH_REQUEST_TIMEOUT_MS, createAuthService } from "./service.js";

export function configuredAuth(origin) {
  const url = import.meta.env.VITE_NEON_AUTH_URL;
  if (!url) return null;
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" || parsed.username || parsed.password) {
    throw new Error("Invalid auth configuration");
  }
  return createAuthService(createAuthClient(new URL("/api/auth", origin).href, {
    adapter: BetterAuthVanillaAdapter({ fetchOptions: { timeout: AUTH_REQUEST_TIMEOUT_MS, retry: 0, credentials: "include" } }),
  }), origin);
}
