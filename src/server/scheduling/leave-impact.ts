import { getPool } from "@/db/client";
import { leaveInterval } from "@/server/leave/date-interval";
import { storeTimezone } from "@/server/leave/access";

export async function leaveImpact(leave:{user_id:string;store_id:string;start_date:string;end_date:string}){
  const present=(await getPool().query<{present:string|null}>("SELECT to_regclass('public.shift_assignments')::text AS present")).rows[0]?.present;
  if(!present) return [];
  const timezone=await storeTimezone(leave.store_id);
  const interval=leaveInterval(leave.start_date,leave.end_date,timezone);
  const rows=(await getPool().query(`SELECT a.id AS assignment_id,sl.work_date,sl.start_at,sl.end_at,s.status AS schedule_status
    FROM shift_assignments a JOIN shift_slots sl ON sl.id=a.slot_id
    JOIN schedules s ON s.id=sl.schedule_id WHERE a.user_id=$1 AND s.store_id=$2
    AND a.status='assigned' AND a.start_at<$4 AND a.end_at>$3 ORDER BY a.start_at`,
    [leave.user_id,leave.store_id,interval.start,interval.end])).rows;
  return rows;
}
