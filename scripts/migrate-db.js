import { readFile, readdir } from "node:fs/promises";
import { neon } from "@neondatabase/serverless";

try {
  const sql = neon(process.env.DATABASE_URL);
  const directory = new URL('../migrations/', import.meta.url);
  for (const name of (await readdir(directory)).filter(name => /^\d+.*\.sql$/.test(name)).sort()) {
    const migration = await readFile(new URL(name, directory), 'utf8');
    const statements = migration.replace(/--[^\n]*/g, "").split(";").map(value => value.trim()).filter(Boolean);
    await sql.transaction(statements.map(statement => sql.query(statement)));
  }
  console.log("Account storage migration completed.");
} catch {
  console.error("Database migration failed. Check DATABASE_URL and database permissions.");
  process.exitCode = 1;
}
