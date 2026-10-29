import { getPool } from "@/db/client";
import { requireStoreRole,type Principal } from "./access";
import { lockUsers } from "./concurrency";
import { scheduleAudit } from "./audit";
import { HttpError } from "./errors";
import { checkCandidate } from "./hard-constraints";
import { snapshotRevision } from "./revisions";
import { scheduleById,scheduleSlots } from "./schedules";
import { validateSchedule } from "./validate-schedule";

async function guardedSchedule(principal:Principal,storeId:string){await requireStoreRole(principal,storeId,"manager");}

export async function addAssignment(principal:Principal,slotId:string,userId:string,expectedVersion:number,reason:string|null){
  const pool=getPool();
  const initial=(await pool.query<{schedule_id:string;store_id:string}>(`SELECT sl.schedule_id,s.store_id FROM shift_slots sl JOIN schedules s ON s.id=sl.schedule_id WHERE sl.id=$1`,[slotId])).rows[0];
  if(!initial)throw new HttpError(404,"not_found","Slot not found");
  await guardedSchedule(principal,initial.store_id);
  const client=await pool.connect();
  try{
    await client.query("BEGIN");
    await lockUsers(client,[userId]);
    const schedule=await scheduleById(client,initial.schedule_id,true);
    if(schedule.version!==expectedVersion)throw new HttpError(409,"stale_version","Schedule version changed");
    if(schedule.status==="published"&&!reason?.trim())throw new HttpError(422,"invalid","Reason required for published schedule");
    if(schedule.status==="archived")throw new HttpError(409,"conflict","Schedule is archived");
    const slot=(await scheduleSlots(client,schedule.id)).find((item)=>item.id===slotId);
    if(!slot)throw new HttpError(404,"not_found","Slot not found");
    const issues=await checkCandidate(client,userId,slot);
    if(issues.length)throw new HttpError(409,"constraint_violation","Candidate violates scheduling constraints",{issues});
    const version=schedule.status==="published"?await snapshotRevision(client,schedule.id,reason!,principal.id):schedule.version;
    const row=(await client.query(`INSERT INTO shift_assignments (slot_id,user_id,start_at,end_at,source,created_by)
      VALUES ($1,$2,$3,$4,'manual',$5) RETURNING *`,[slot.id,userId,slot.start_at,slot.end_at,principal.id])).rows[0];
    const validation=await validateSchedule(client,schedule.id);
    if(validation.violations.length)throw new HttpError(409,"constraint_violation","Schedule has hard constraint violations",{violations:validation.violations});
    await scheduleAudit(client,principal.id,schedule.store_id,"assignment.add","assignment",row.id,null,row);
    await client.query("COMMIT");
    return {assignment:row,version};
  }catch(error){await client.query("ROLLBACK");throw error;}finally{client.release();}
}

export async function editAssignment(principal:Principal,id:string,input:{action:"reassign"|"unassign"|"pin"|"unpin";user_id?:string;expected_version:number;reason?:string}){
  const pool=getPool();
  const initial=(await pool.query<{user_id:string;store_id:string;schedule_id:string}>(`SELECT a.user_id,s.store_id,s.id AS schedule_id
    FROM shift_assignments a JOIN shift_slots sl ON sl.id=a.slot_id JOIN schedules s ON s.id=sl.schedule_id WHERE a.id=$1`,[id])).rows[0];
  if(!initial)throw new HttpError(404,"not_found","Assignment not found");
  await guardedSchedule(principal,initial.store_id);
  const client=await pool.connect();
  try{
    await client.query("BEGIN");
    await lockUsers(client,[initial.user_id,...(input.user_id?[input.user_id]:[])]);
    const schedule=await scheduleById(client,initial.schedule_id,true);
    if(schedule.version!==input.expected_version)throw new HttpError(409,"stale_version","Schedule version changed");
    if(schedule.status==="published"&&!input.reason?.trim())throw new HttpError(422,"invalid","Reason required for published schedule");
    if(schedule.status==="archived")throw new HttpError(409,"conflict","Schedule is archived");
    const before=(await client.query(`SELECT * FROM shift_assignments WHERE id=$1 FOR UPDATE`,[id])).rows[0];
    if(!before||before.user_id!==initial.user_id||before.status!=="assigned")throw new HttpError(409,"conflict","Assignment changed");
    if(before.is_pinned&&(input.action==="reassign"||input.action==="unassign"))throw new HttpError(409,"pinned","Unpin the shift first");
    if(input.action==="reassign"){
      if(!input.user_id)throw new HttpError(422,"invalid","user_id required");
      const slot=(await scheduleSlots(client,schedule.id)).find((item)=>item.id===before.slot_id);
      if(!slot)throw new HttpError(404,"not_found","Slot not found");
      const issues=await checkCandidate(client,input.user_id,slot,id);
      if(issues.length)throw new HttpError(409,"constraint_violation","Candidate violates scheduling constraints",{issues});
    }
    const version=schedule.status==="published"?await snapshotRevision(client,schedule.id,input.reason!,principal.id):schedule.version;
    const updated=(await client.query(`UPDATE shift_assignments SET
      user_id=CASE WHEN $2='reassign' THEN $3::uuid ELSE user_id END,
      status=CASE WHEN $2='unassign' THEN 'cancelled' ELSE status END,
      is_pinned=CASE WHEN $2='pin' THEN true WHEN $2='unpin' THEN false ELSE is_pinned END
      WHERE id=$1 RETURNING *`,[id,input.action,input.user_id??null])).rows[0];
    const validation=await validateSchedule(client,schedule.id);
    if(validation.violations.length)throw new HttpError(409,"constraint_violation","Schedule has hard constraint violations",{violations:validation.violations});
    await scheduleAudit(client,principal.id,schedule.store_id,`assignment.${input.action}`,"assignment",id,before,updated);
    await client.query("COMMIT");
    return {assignment:updated,version};
  }catch(error){await client.query("ROLLBACK");throw error;}finally{client.release();}
}
