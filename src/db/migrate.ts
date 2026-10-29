import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { loadEnvConfig } from "@next/env";
import { getPool } from "./client";

loadEnvConfig(process.cwd());

async function main() {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext('shiftly_migrations'))");
    await client.query("CREATE TABLE IF NOT EXISTS app_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())");
    const directory = join(process.cwd(), "src", "db", "migrations");
    for (const migration of readdirSync(directory).filter((name) => /^\d{4}_.+\.sql$/.test(name)).sort()) {
      const existing = await client.query("SELECT 1 FROM app_migrations WHERE name = $1", [migration]);
      if (existing.rowCount === 0) {
        await client.query(readFileSync(join(directory, migration), "utf8"));
        await client.query("INSERT INTO app_migrations (name) VALUES ($1)", [migration]);
        console.info(`Applied ${migration}`);
      }
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await getPool().end();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
