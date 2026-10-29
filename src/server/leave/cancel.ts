import { getPool } from "@/db/client";
import { type Principal,storeTimezone } from "./access";
import { leaveAudit } from "./audit";
import { mayCancel } from "./date-range";
import { HttpError } from "./errors";
import { findRequest,publicRequest,updateStatusIf } from "./repository";
import { lockLeaveUser } from "./review-lock";

export async function cancelLeave(principal:Principal,id:string){
  const initial=await findRequest(id);
  if(initial.user_id!==principal.id) throw new HttpError(404,"not_found","Leave request not found");
  const client=await getPool().connect();
  try{
    await client.query("BEGIN");
    await lockLeaveUser(client,principal.id);
    const row=await findRequest(id,client,true);
    if(row.user_id!==principal.id) throw new HttpError(404,"not_found","Leave request not found");
    const timezone=await storeTimezone(row.store_id);
    if(!mayCancel(row.status,row.start_date,timezone)) throw new HttpError(409,"conflict","Request can no longer be cancelled");
    await updateStatusIf(client,id,row.status,"cancelled");
    const result=await findRequest(id,client);
    await leaveAudit(client,principal.id,row.store_id,"leave.cancel",id,row,result);
    await client.query("COMMIT");
    return publicRequest(result);
  }catch(error){await client.query("ROLLBACK");throw error;}
  finally{client.release();}
}
