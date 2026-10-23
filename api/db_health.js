import { HTTP_STATUS } from '../server/http.js';
import { neon } from "@neondatabase/serverless";

export default async function handler(request, response) {
  response.setHeader("Cache-Control", "no-store");

  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return response.status(HTTP_STATUS.METHOD_NOT_ALLOWED).json({ error: "Method not allowed" });
  }

  if (!process.env.DATABASE_URL?.trim()) {
    return response.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json({
      ok: false,
      error: "Chybí nastavení DATABASE_URL na serveru",
    });
  }

  try {
    const sql = neon(process.env.DATABASE_URL);
    await sql`SELECT 1`;

    return response.status(HTTP_STATUS.OK).json({ ok: true });
  } catch {
    return response.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      ok: false,
      error: "Databáze není dostupná",
    });
  }
}
