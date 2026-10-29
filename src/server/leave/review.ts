import { getPool } from "@/db/client";
import { requireReviewer,type Principal } from "./access";
import { leaveAudit } from "./audit";
import { HttpError } from "./errors";
import { findRequest,publicRequest,updateStatusIf } from "./repository";
import { lockLeaveUser } from "./review-lock";
import { applyApprovedLeave } from "./scheduling-bridge";
import { lockAffectedSchedules } from "@/server/scheduling/needs-cover";

export async function reviewLeave(principal:Principal,id:string,decision:"approved"|"rejected",note:string|null){
  if(decision==="rejected"&&!note?.trim()) throw new HttpError(422,"invalid","Review note is required when rejecting");
  const initial=await findRequest(id);
  await requireReviewer(principal,initial);
  const client=await getPool().connect();
  try{
    await client.query("BEGIN");
    await lockLeaveUser(client,initial.user_id);
    if(decision==="approved") await lockAffectedSchedules(client,initial);
    const row=await findRequest(id,client,true);
    if(row.status!=="pending") throw new HttpError(409,"conflict","Request has already changed status");
    if(row.user_id!==initial.user_id) throw new HttpError(409,"conflict","Request changed");
    if(principal.systemRole!=="admin"){
      const membership=await client.query(`SELECT 1 FROM store_memberships manager
        JOIN store_memberships employee ON employee.store_id=manager.store_id
        WHERE manager.user_id=$1 AND manager.store_id=$2 AND manager.role_in_store='manager'
          AND manager.left_at IS NULL AND employee.user_id=$3 AND employee.managed_by=$1`,
        [principal.id,row.store_id,row.user_id]);
      if(!membership.rowCount) throw new HttpError(403,"forbidden","Manager role was revoked");
    }
    const reviewedAt=new Date();
    await updateStatusIf(client,id,"pending",decision,{actorId:principal.id,at:reviewedAt,note:note?.trim()||null});
    const affected=decision==="approved"?await applyApprovedLeave(client,row,reviewedAt):0;
    const result=await findRequest(id,client);
    await leaveAudit(client,principal.id,row.store_id,decision==="approved"?"leave.approve":"leave.reject",id,row,{...result,affected_assignments:affected});
    await client.query("COMMIT");
    return {...publicRequest(result),affected_assignments:affected};
  }catch(error){await client.query("ROLLBACK");throw error;}
  finally{client.release();}
}
