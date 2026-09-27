import { neon } from "@neondatabase/serverless";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!process.env.DATABASE_URL?.trim()) {
    return res.status(503).json({
      ok: false,
      error: "Chybí nastavení DATABASE_URL na serveru",
    });
  }

  try {
    const sql = neon(process.env.DATABASE_URL);
    await sql`SELECT 1`;

    return res.status(200).json({ ok: true });
  } catch {
    return res.status(500).json({
      ok: false,
      error: "Databáze není dostupná",
    });
  }
}
