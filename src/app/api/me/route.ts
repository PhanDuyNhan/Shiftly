import { NextResponse } from "next/server";
import { getPool } from "@/db/client";
import { errorResponse } from "@/server/auth/errors";
import { requirePrincipal } from "@/server/auth/session";

export async function GET(request: Request) {
  try {
    const principal = await requirePrincipal(request, true);
    const [user, memberships] = await Promise.all([
      getPool().query("SELECT id, email, phone, system_role, status, must_change_password FROM users WHERE id = $1", [principal.id]),
      getPool().query(`SELECT m.store_id, m.role_in_store, m.employment_type, s.name AS store_name
        FROM store_memberships m JOIN stores s ON s.id = m.store_id
        WHERE m.user_id = $1 AND m.left_at IS NULL`, [principal.id]),
    ]);
    return NextResponse.json({ ...user.rows[0], memberships: memberships.rows });
  } catch (error) { return errorResponse(error); }
}
