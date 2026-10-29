import { getPool } from "@/db/client";
import { HttpError } from "./errors";
import type { Principal } from "./session";

export async function requireAdmin(principal: Principal): Promise<void> {
  if (principal.systemRole !== "admin") throw new HttpError(403, "forbidden", "Admin role required");
}

export async function requireStoreRole(principal: Principal, storeId: string, role: "employee" | "manager"): Promise<void> {
  if (principal.systemRole === "admin" && role === "manager") return;
  const result = await getPool().query(`SELECT 1 FROM store_memberships m
    JOIN stores s ON s.id = m.store_id WHERE m.user_id = $1 AND m.store_id = $2
    AND m.left_at IS NULL AND s.is_active = true
    AND ($3 = 'employee' OR m.role_in_store = 'manager')`, [principal.id, storeId, role]);
  if (!result.rowCount) throw new HttpError(403, "forbidden", "Store role required");
}

export async function canManageStore(principal: Principal, storeId: string): Promise<boolean> {
  if (principal.systemRole === "admin") return true;
  const result = await getPool().query(`SELECT 1 FROM store_memberships WHERE user_id = $1 AND store_id = $2
    AND role_in_store = 'manager' AND left_at IS NULL`, [principal.id, storeId]);
  return !!result.rowCount;
}
