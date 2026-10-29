import { getPool } from "@/db/client";
import { assertMonday,weekEnd } from "./time";

export async function readPublished(userId:string,week:string){
  assertMonday(week);
  const rows=(await getPool().query(`SELECT a.id AS assignment_id,sl.work_date,sl.start_at,sl.end_at,
    sl.position_id,s.store_id,st.name AS store_name,st.timezone,s.version,s.week_start
    FROM shift_assignments a JOIN shift_slots sl ON sl.id=a.slot_id JOIN schedules s ON s.id=sl.schedule_id
    JOIN stores st ON st.id=s.store_id
    WHERE a.user_id=$1 AND a.status='assigned' AND s.status='published' AND sl.work_date BETWEEN $2 AND $3
    ORDER BY sl.start_at`,[userId,week,weekEnd(week)])).rows;
  return rows;
}
