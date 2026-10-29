import { getPool } from "@/db/client";
import { canManageStore } from "@/server/auth/access";
import { HttpError } from "@/server/auth/errors";
import { requirePrincipal, type Principal } from "@/server/auth/session";

export { requirePrincipal };
export type { Principal };

export async function requireEmployee(principal: Principal, storeId: string): Promise<void> {
  const row=await getPool().query(`SELECT 1 FROM store_memberships m JOIN stores s ON s.id=m.store_id
    WHERE m.user_id=$1 AND m.store_id=$2 AND m.role_in_store='employee'
      AND m.left_at IS NULL AND s.is_active=true`,[principal.id,storeId]);
  if(!row.rowCount)throw new HttpError(403,"forbidden","Employee must use the home store");
}

async function managesRequest(principal:Principal,request:{user_id:string;store_id:string}):Promise<boolean>{
  if(principal.systemRole==="admin")return true;
  if(!await canManageStore(principal,request.store_id))return false;
  const row=await getPool().query(`SELECT 1 FROM store_memberships WHERE user_id=$1
    AND store_id=$2 AND managed_by=$3`,[request.user_id,request.store_id,principal.id]);
  return !!row.rowCount;
}

export async function canReadRequest(principal: Principal, request: {user_id:string;store_id:string}): Promise<boolean> {
  return principal.id === request.user_id || await managesRequest(principal,request);
}

export async function requireReviewer(principal: Principal, request: {user_id:string;store_id:string}): Promise<void> {
  if (principal.id === request.user_id) throw new HttpError(403,"forbidden","Cannot review your own request");
  if (!await managesRequest(principal,request)) throw new HttpError(403,"forbidden","This employee is managed by another manager");
}

export async function storeTimezone(storeId:string):Promise<string> {
  const row = (await getPool().query<{timezone:string}>("SELECT timezone FROM stores WHERE id=$1",[storeId])).rows[0];
  if (!row) throw new HttpError(404,"not_found","Store not found");
  return row.timezone;
}
