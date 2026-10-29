import { createHash, createHmac, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { getPool } from "@/db/client";
import { HttpError } from "./errors";

export type Principal = {
  id: string;
  systemRole: "admin" | "user";
  status: "active" | "locked" | "left";
  mustChangePassword: boolean;
  tokenHash: string;
  csrfTokenHash: string;
};

const digest = (value: string) => createHash("sha256").update(value).digest("hex");

function cookieValue(header: string | null, name: string): string | undefined {
  const match = header?.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

export async function currentPrincipal(request?: Request): Promise<Principal | null> {
  const token = request ? cookieValue(request.headers.get("cookie"), "session") : (await cookies()).get("session")?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const result = await getPool().query<{
    id: string; system_role: "admin" | "user"; status: Principal["status"];
    must_change_password: boolean; token_hash: string; csrf_token_hash: string;
  }>(`SELECT u.id, u.system_role, u.status, u.must_change_password, s.token_hash, s.csrf_token_hash
      FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = $1 AND s.expires_at > now()`, [digest(token)]);
  const row = result.rows[0];
  if (!row || row.status !== "active") return null;
  return { id: row.id, systemRole: row.system_role, status: row.status,
    mustChangePassword: row.must_change_password, tokenHash: row.token_hash, csrfTokenHash: row.csrf_token_hash };
}

export async function requirePrincipal(request?: Request, allowPasswordChange = false): Promise<Principal> {
  const principal = await currentPrincipal(request);
  if (!principal) throw new HttpError(401, "unauthorized", "Sign in required");
  if (principal.mustChangePassword && !allowPasswordChange) {
    throw new HttpError(403, "password_change_required", "Change your temporary password first");
  }
  return principal;
}

export async function createSession(userId: string): Promise<{ token: string; csrfToken: string }> {
  const token = randomBytes(32).toString("hex");
  const csrfToken = randomBytes(32).toString("hex");
  await getPool().query(`INSERT INTO sessions (token_hash, user_id, csrf_token_hash, expires_at)
    VALUES ($1, $2, $3, now() + interval '7 days')`, [digest(token), userId, digest(csrfToken)]);
  return { token, csrfToken };
}

export async function revokeSession(principal: Principal): Promise<void> {
  await getPool().query("DELETE FROM sessions WHERE token_hash = $1", [principal.tokenHash]);
}

export function setSessionCookies(response: import("next/server").NextResponse, token: string, csrfToken: string): void {
  const secure = process.env.NODE_ENV === "production";
  response.cookies.set("session", token, { httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: 7 * 24 * 3600 });
  response.cookies.set("csrf", csrfToken, { httpOnly: false, secure, sameSite: "lax", path: "/", maxAge: 7 * 24 * 3600 });
}

export function clearSessionCookies(response: import("next/server").NextResponse): void {
  response.cookies.delete("session");
  response.cookies.delete("csrf");
}

export function hashCsrf(token: string): string { return digest(token); }

export function identifierHash(identifier: string): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error("SESSION_SECRET must be at least 32 characters");
  return createHmac("sha256", secret).update(identifier.trim().toLowerCase()).digest("hex");
}
