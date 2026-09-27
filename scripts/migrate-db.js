import { readFile } from "node:fs/promises";
import { neon } from "@neondatabase/serverless";

try {
  const sql = neon(process.env.DATABASE_URL);
  const migration = await readFile(new URL("../migrations/001-account-state.sql", import.meta.url), "utf8");
  const statements = migration.replace(/--[^\n]*/g, "").split(";").map(value => value.trim()).filter(Boolean);
  await sql.transaction(statements.map(statement => sql.query(statement)));
  console.log("Account storage migration completed.");
} catch {
  console.error("Database migration failed. Check DATABASE_URL and database permissions.");
  process.exitCode = 1;
}
