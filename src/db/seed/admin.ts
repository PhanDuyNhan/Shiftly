import { getPool } from "../client";
import { hashPassword } from "../../server/auth/password";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

async function main() {
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  if (!email || !password) throw new Error("Set BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD");
  const result = await getPool().query(`INSERT INTO users (email, password_hash, system_role, must_change_password)
    VALUES ($1, $2, 'admin', true) ON CONFLICT (email) DO NOTHING RETURNING id`, [email, await hashPassword(password)]);
  console.info(result.rowCount ? "Admin created; change temporary password on first login" : "Admin already exists");
  await getPool().end();
}
main().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
