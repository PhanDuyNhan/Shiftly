import type { PoolClient } from "pg";
import { getPool } from "@/db/client";
import { HttpError } from "./errors";
import { canReadRequest,type Principal } from "./access";

export type LeaveRow={id:string;user_id:string;store_id:string;leave_type_id:string;start_date:string;end_date:string;reason:string;attachment_url:string|null;status:"pending"|"approved"|"rejected"|"cancelled";reviewed_by:string|null;reviewed_at:Date|null;review_note:string|null;created_at:Date;leave_type_name:string};

export async function findRequest(id:string,client?:PoolClient,lock=false):Promise<LeaveRow>{
  const db=client??getPool();
  const result=await db.query<LeaveRow>(`SELECT r.*,t.name AS leave_type_name FROM leave_requests r
    JOIN leave_types t ON t.id=r.leave_type_id WHERE r.id=$1 ${lock?"FOR UPDATE OF r":""}`,[id]);
  if(!result.rows[0]) throw new HttpError(404,"not_found","Leave request not found");
  return result.rows[0];
}

export async function findScopedRequest(principal:Principal,id:string):Promise<LeaveRow>{
  const row=await findRequest(id);
  if(!await canReadRequest(principal,row))throw new HttpError(404,"not_found","Leave request not found");
  return row;
}

export async function activeLeaveTypes(includeInactive=false){
  return (await getPool().query("SELECT * FROM leave_types WHERE $1::boolean OR is_active=true ORDER BY name",[includeInactive])).rows;
}

export async function updateStatusIf(client:PoolClient,id:string,from:LeaveRow["status"],to:LeaveRow["status"],review?:{actorId:string;at:Date;note:string|null}){
  const result=await client.query(`UPDATE leave_requests SET status=$3,
    reviewed_by=CASE WHEN $4::uuid IS NULL THEN reviewed_by ELSE $4 END,
    reviewed_at=CASE WHEN $5::timestamptz IS NULL THEN reviewed_at ELSE $5 END,
    review_note=CASE WHEN $4::uuid IS NULL THEN review_note ELSE $6 END
    WHERE id=$1 AND status=$2 RETURNING id`,[id,from,to,review?.actorId??null,review?.at??null,review?.note??null]);
  if(!result.rowCount)throw new HttpError(409,"conflict","Request has already changed status");
}

export function publicRequest(row:LeaveRow){
  const {attachment_url: _attachment,...publicRow}=row;
  return {...publicRow,has_attachment:!!row.attachment_url};
}

export async function listOwn(userId:string){
  const rows=(await getPool().query<LeaveRow>(`SELECT r.*,t.name AS leave_type_name FROM leave_requests r
    JOIN leave_types t ON t.id=r.leave_type_id WHERE r.user_id=$1 ORDER BY r.created_at DESC`,[userId])).rows;
  return rows.map(publicRequest);
}

export async function listForStore(storeId:string,filters:{status?:string;from?:string;to?:string},managerId:string|null){
  const rows=(await getPool().query<LeaveRow>(`SELECT r.*,t.name AS leave_type_name FROM leave_requests r
    JOIN leave_types t ON t.id=r.leave_type_id
    LEFT JOIN store_memberships m ON m.user_id=r.user_id AND m.store_id=r.store_id
    WHERE r.store_id=$1 AND ($2::leave_status IS NULL OR r.status=$2)
    AND ($3::date IS NULL OR r.end_date >= $3) AND ($4::date IS NULL OR r.start_date <= $4)
    AND ($5::uuid IS NULL OR m.managed_by=$5)
    ORDER BY r.created_at DESC`,[storeId,filters.status??null,filters.from??null,filters.to??null,managerId])).rows;
  return rows.map(publicRequest);
}
