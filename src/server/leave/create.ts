import { getPool } from "@/db/client";
import { storePrivate,removePrivate } from "@/server/storage/private-attachment";
import { requireEmployee,type Principal } from "./access";
import { validateAttachment } from "./attachments";
import { leaveAudit } from "./audit";
import { HttpError } from "./errors";
import { findRequest,publicRequest } from "./repository";
import type { LeaveInput } from "./validation";

export async function createLeave(principal:Principal,input:LeaveInput,file:File|null){
  await requireEmployee(principal,input.store_id);
  const type=(await getPool().query<{id:string;requires_attachment:boolean}>(
    "SELECT id,requires_attachment FROM leave_types WHERE id=$1 AND is_active=true",[input.leave_type_id])).rows[0];
  if(!type) throw new HttpError(422,"invalid","Leave type is inactive or missing");
  if(type.requires_attachment&&!file) throw new HttpError(422,"invalid","Attachment is required for this leave type");
  const attachment=file?await validateAttachment(file):null;
  let key:string|null=null;
  if(attachment) key=await storePrivate(attachment.bytes,attachment.extension);
  const client=await getPool().connect();
  try{
    await client.query("BEGIN");
    // Re-check membership and type inside the transaction before insert.
    const membership=await client.query(`SELECT 1 FROM store_memberships m JOIN stores s ON s.id=m.store_id
      WHERE m.user_id=$1 AND m.store_id=$2 AND m.role_in_store='employee'
        AND m.left_at IS NULL AND s.is_active=true`,[principal.id,input.store_id]);
    const activeType=await client.query<{requires_attachment:boolean}>("SELECT requires_attachment FROM leave_types WHERE id=$1 AND is_active=true FOR SHARE",[input.leave_type_id]);
    if(!membership.rowCount||!activeType.rowCount) throw new HttpError(403,"forbidden","Membership or leave type is no longer active");
    if(activeType.rows[0].requires_attachment&&!key) throw new HttpError(422,"invalid","Attachment is required for this leave type");
    const inserted=await client.query<{id:string}>(`INSERT INTO leave_requests
      (user_id,store_id,leave_type_id,start_date,end_date,reason,attachment_url)
      VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,[principal.id,input.store_id,input.leave_type_id,input.start_date,input.end_date,input.reason,key]);
    const row=await findRequest(inserted.rows[0].id,client);
    await leaveAudit(client,principal.id,input.store_id,"leave.create",row.id,null,row);
    await client.query("COMMIT");
    return publicRequest(row);
  }catch(error){
    await client.query("ROLLBACK");
    if(key) {try{await removePrivate(key);}catch(cleanupError){console.error("Orphaned leave attachment",key,cleanupError);}}
    throw error;
  }finally{client.release();}
}
