import { NextResponse } from "next/server";
import { z } from "zod";
import { getPool } from "@/db/client";
import { verifyCsrf } from "@/server/auth/csrf";
import { errorResponse, HttpError } from "@/server/auth/errors";
import { hashPassword, verifyPassword } from "@/server/auth/password";
import { requirePrincipal } from "@/server/auth/session";

const schema = z.object({ old_password: z.string(), new_password: z.string().min(12) }).strict();

export async function POST(request: Request) {
  try {
    const principal = await requirePrincipal(request, true);
    verifyCsrf(request, principal);
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) throw new HttpError(422, "invalid", "New password must have at least 12 characters");
    const client = await getPool().connect();
    try {
      await client.query("BEGIN");
      const result = await client.query<{ password_hash: string }>("SELECT password_hash FROM users WHERE id = $1 FOR UPDATE", [principal.id]);
      if (!result.rows[0] || !await verifyPassword(parsed.data.old_password, result.rows[0].password_hash)) {
        throw new HttpError(403, "invalid_password", "Current password is incorrect");
      }
      await client.query("UPDATE users SET password_hash = $2, must_change_password = false WHERE id = $1",
        [principal.id, await hashPassword(parsed.data.new_password)]);
      await client.query("DELETE FROM sessions WHERE user_id = $1 AND token_hash <> $2", [principal.id, principal.tokenHash]);
      await client.query("COMMIT");
    } catch (error) { await client.query("ROLLBACK"); throw error; }
    finally { client.release(); }
    return NextResponse.json({ ok: true });
  } catch (error) { return errorResponse(error); }
}
