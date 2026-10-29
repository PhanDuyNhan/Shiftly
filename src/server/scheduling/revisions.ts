import type { PoolClient } from "pg";
import { scheduleById } from "./schedules";

export async function snapshotRevision(client:PoolClient,scheduleId:string,reason:string,actorId:string|null){
  if(!reason.trim())throw new Error("Revision reason is required");
  const schedule=await scheduleById(client,scheduleId,true);
  const slots=(await client.query("SELECT * FROM shift_slots WHERE schedule_id=$1 ORDER BY id",[scheduleId])).rows;
  const assignments=(await client.query(`SELECT a.* FROM shift_assignments a JOIN shift_slots sl ON sl.id=a.slot_id
    WHERE sl.schedule_id=$1 ORDER BY a.id`,[scheduleId])).rows;
  await client.query(`INSERT INTO schedule_revisions (schedule_id,version,snapshot,reason,changed_by)
    VALUES ($1,$2,$3,$4,$5)`,[scheduleId,schedule.version,JSON.stringify({schedule,slots,assignments}),reason.trim(),actorId]);
  await client.query("UPDATE schedules SET version=version+1 WHERE id=$1",[scheduleId]);
  return schedule.version+1;
}
