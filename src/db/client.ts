import { drizzle } from "drizzle-orm/node-postgres";
import { Pool, types } from "pg";
import * as leaveSchema from "./schema/leave";
import * as schedulingSchema from "./schema/scheduling";

// PostgreSQL DATE represents a store-local calendar day, not an instant.
// Keep it as YYYY-MM-DD so timezone conversion happens only at explicit boundaries.
types.setTypeParser(1082, (value) => value);

let pool: Pool | undefined;

export function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error("DATABASE_URL is required");
    pool = new Pool({ connectionString, max: 10 });
  }
  return pool;
}

export function getDb() {
  return drizzle(getPool(), { schema: { ...leaveSchema, ...schedulingSchema } });
}

export type Database = ReturnType<typeof getDb>;
