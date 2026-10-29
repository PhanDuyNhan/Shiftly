import { NextResponse } from "next/server";
import { z } from "zod";
import { getPool } from "@/db/client";
import { errorResponse, HttpError } from "@/server/auth/errors";
import { verifyPassword } from "@/server/auth/password";
import { createSession, identifierHash, setSessionCookies } from "@/server/auth/session";

const inputSchema = z.object({ identifier: z.string().trim().min(1), password: z.string().min(1) }).strict();

export async function POST(request: Request) {
  try {
    if (request.headers.get("origin") !== process.env.APP_ORIGIN) throw new HttpError(403, "csrf", "Invalid request origin");
    const parsed = inputSchema.safeParse(await request.json());
    if (!parsed.success) throw new HttpError(422, "invalid", "Enter identifier and password");
    const identifier = parsed.data.identifier.toLowerCase();
    const key = identifierHash(identifier);
    const pool = getPool();
    const blocked = await pool.query("SELECT blocked_until FROM login_attempts WHERE identifier_hash = $1", [key]);
    if (blocked.rows[0]?.blocked_until && new Date(blocked.rows[0].blocked_until) > new Date()) {
      throw new HttpError(429, "login_limited", "Try again later");
    }
    const user = await pool.query<{ id: string; password_hash: string; status: string; must_change_password: boolean }>(
      "SELECT id, password_hash, status, must_change_password FROM users WHERE lower(email) = $1 OR phone = $1 LIMIT 1", [identifier]);
    const row = user.rows[0];
    const valid = row ? await verifyPassword(parsed.data.password, row.password_hash) : false;
    if (!valid || row?.status !== "active") {
      await pool.query(`INSERT INTO login_attempts (identifier_hash, failure_count, window_started_at, blocked_until)
        VALUES ($1, 1, now(), NULL)
        ON CONFLICT (identifier_hash) DO UPDATE SET
          failure_count = CASE WHEN login_attempts.window_started_at < now() - interval '15 minutes' THEN 1 ELSE login_attempts.failure_count + 1 END,
          window_started_at = CASE WHEN login_attempts.window_started_at < now() - interval '15 minutes' THEN now() ELSE login_attempts.window_started_at END,
          blocked_until = CASE WHEN login_attempts.window_started_at >= now() - interval '15 minutes' AND login_attempts.failure_count >= 4
            THEN now() + interval '15 minutes' ELSE NULL END`, [key]);
      throw new HttpError(401, "invalid_credentials", "Invalid credentials");
    }
    await pool.query("DELETE FROM login_attempts WHERE identifier_hash = $1", [key]);
    await pool.query("UPDATE users SET last_login_at = now() WHERE id = $1", [row.id]);
    const { token, csrfToken } = await createSession(row.id);
    const response = NextResponse.json({ user_id: row.id, must_change_password: row.must_change_password });
    setSessionCookies(response, token, csrfToken);
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
