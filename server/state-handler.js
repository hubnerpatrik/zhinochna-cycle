import { normalizeApplicationData } from "../data-validation.js";

export const MAX_STATE_BYTES = 2 * 1024 * 1024;

// Dependencies are injected so tests exercise the same authorization boundary as production.
export function createStateHandler({ identify, repository }) {
  return async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Vary", "Authorization");
    res.setHeader("X-Content-Type-Options", "nosniff");
    if (!["GET", "PUT"].includes(req.method)) {
      res.setHeader("Allow", "GET, PUT");
      return res.status(405).json({ error: "method_not_allowed" });
    }
    let userId;
    try { userId = await identify(req.headers.authorization); }
    catch { return res.status(401).json({ error: "unauthorized" }); }
    if (req.method === "GET") {
      try { return res.status(200).json(await repository.read(userId)); }
      catch { return res.status(503).json({ error: "storage_unavailable" }); }
    }
    if (!/^application\/json(?:;|$)/i.test(req.headers["content-type"] || "")) {
      return res.status(415).json({ error: "json_required" });
    }
    let input;
    let data;
    try {
      const raw = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
      if (!raw || Buffer.byteLength(raw) > MAX_STATE_BYTES) return res.status(413).json({ error: "state_too_large" });
      input = JSON.parse(raw);
      if (!Number.isSafeInteger(input.version) || input.version < 0 || input.version >= 2147483647
        || typeof input.mutationId !== "string" || !/^[a-f0-9-]{36}$/i.test(input.mutationId)
        || Object.keys(input).some(key => !["version", "mutationId", "data"].includes(key))) throw new Error("Invalid input");
      data = normalizeApplicationData(input.data, { strict: true });
    } catch { return res.status(400).json({ error: "invalid_state" }); }
    try {
      const result = await repository.write(userId, { ...input, data });
      return result ? res.status(200).json(result) : res.status(409).json({ error: "version_conflict" });
    } catch { return res.status(503).json({ error: "storage_unavailable" }); }
  };
}
