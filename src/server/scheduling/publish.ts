import { getPool } from "@/db/client";
import { requireStoreRole,type Principal } from "./access";
import { lockUsers } from "./concurrency";
import { scheduleAudit } from "./audit";
import { HttpError } from "./errors";
import { scheduleById } from "./schedules";
import { validateSchedule } from "./validate-schedule";

export async function publishSchedule(principal:Principal,id:string){
  const pool=getPool();
  const initial=(await pool.query<{store_id:string}>("SELECT store_id FROM schedules WHERE id=$1",[id])).rows[0];
  if(!initial)throw new HttpError(404,"not_found","Schedule not found");
  await requireStoreRole(principal,initial.store_id,"manager");
  const client=await pool.connect();
  try{
    await client.query("BEGIN");
    const users=(await client.query<{user_id:string}>(`SELECT DISTINCT a.user_id FROM shift_assignments a
      JOIN shift_slots sl ON sl.id=a.slot_id WHERE sl.schedule_id=$1 AND a.status='assigned'`,[id])).rows.map((row)=>row.user_id);
    await lockUsers(client,users);
    const schedule=await scheduleById(client,id,true);
    if(schedule.status!=="draft")throw new HttpError(409,"conflict","Schedule is not a draft");
    const result=await validateSchedule(client,id);
    if(result.violations.length)throw new HttpError(409,"constraint_violation","Schedule has hard constraint violations",{violations:result.violations});
    const updated=(await client.query("UPDATE schedules SET status='published',published_at=now(),published_by=$2 WHERE id=$1 RETURNING *",[id,principal.id])).rows[0];
    await scheduleAudit(client,principal.id,schedule.store_id,"schedule.publish","schedule",id,schedule,updated);
    await client.query("COMMIT");
    return {...updated,warnings:result.warnings};
  }catch(error){await client.query("ROLLBACK");throw error;}finally{client.release();}
}
