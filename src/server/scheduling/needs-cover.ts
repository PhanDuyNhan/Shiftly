import type { PoolClient } from "pg";

export async function lockAffectedSchedules(client:PoolClient,leave:{user_id:string;store_id:string;start_date:string;end_date:string}):Promise<void>{
  const result=await client.query<{id:string}>(`SELECT DISTINCT s.id FROM schedules s
    JOIN shift_slots sl ON sl.schedule_id=s.id JOIN shift_assignments a ON a.slot_id=sl.id
    JOIN stores st ON st.id=$2
    WHERE a.user_id=$1 AND s.status='published' AND a.status='assigned'
      AND a.end_at>now() AND tstzrange(a.start_at,a.end_at,'[)') && tstzrange(
        $3::date::timestamp AT TIME ZONE st.timezone,
        ($4::date+1)::timestamp AT TIME ZONE st.timezone,'[)') ORDER BY s.id`,
    [leave.user_id,leave.store_id,leave.start_date,leave.end_date]);
  for(const row of result.rows) await client.query("SELECT id FROM schedules WHERE id=$1 FOR UPDATE",[row.id]);
}

export async function markNeedsCover(client:PoolClient,leave:{id:string;user_id:string;store_id:string;start_date:string;end_date:string},reviewedAt:Date):Promise<number>{
  const available=await client.query<{present:string|null}>("SELECT to_regclass('public.shift_assignments')::text AS present");
  if(!available.rows[0]?.present) return 0;
  const affected=await client.query<{id:string;slot_id:string;schedule_id:string}>(`SELECT a.id,a.slot_id,s.id AS schedule_id
    FROM shift_assignments a JOIN shift_slots sl ON sl.id=a.slot_id
    JOIN schedules s ON s.id=sl.schedule_id JOIN stores st ON st.id=$2
    WHERE a.user_id=$1 AND s.status='published' AND a.status='assigned'
      AND a.end_at>$5
      AND tstzrange(a.start_at,a.end_at,'[)') && tstzrange(
        $3::date::timestamp AT TIME ZONE st.timezone,
        ($4::date+1)::timestamp AT TIME ZONE st.timezone,'[)')
    FOR UPDATE OF a`,[leave.user_id,leave.store_id,leave.start_date,leave.end_date,reviewedAt]);
  const scheduleIds=[...new Set(affected.rows.map((row)=>row.schedule_id))].sort();
  for(const scheduleId of scheduleIds){
    const schedule=(await client.query("SELECT * FROM schedules WHERE id=$1 FOR UPDATE",[scheduleId])).rows[0];
    const slots=(await client.query("SELECT * FROM shift_slots WHERE schedule_id=$1 ORDER BY id",[scheduleId])).rows;
    const assignments=(await client.query(`SELECT a.* FROM shift_assignments a JOIN shift_slots sl ON sl.id=a.slot_id
      WHERE sl.schedule_id=$1 ORDER BY a.id`,[scheduleId])).rows;
    const snapshot={schedule,slots,assignments};
    await client.query(`INSERT INTO schedule_revisions (schedule_id,version,snapshot,reason,changed_by)
      VALUES ($1,$2,$3,$4,NULL)`,[scheduleId,schedule.version,JSON.stringify(snapshot),`approved_leave:${leave.id}`]);
    await client.query("UPDATE schedules SET version=version+1 WHERE id=$1",[scheduleId]);
    await client.query(`INSERT INTO audit_logs (store_id,action,entity_type,entity_id,before_data,after_data)
      VALUES ($1,'schedule.leave_approved','schedule',$2,$3,$4)`,[schedule.store_id,scheduleId,JSON.stringify(snapshot),JSON.stringify({leave_request_id:leave.id,needs_cover:affected.rows.filter((row)=>row.schedule_id===scheduleId).length})]);
  }
  if(affected.rows.length) await client.query("UPDATE shift_assignments SET status='needs_cover' WHERE id=ANY($1::uuid[])",[affected.rows.map((row)=>row.id)]);
  return affected.rows.length;
}
