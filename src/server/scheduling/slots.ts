import type { PoolClient } from "pg";
import { shiftInterval,addDays } from "./time";

export async function createSlotsForSchedule(client:PoolClient,scheduleId:string,storeId:string,week:string,timezone:string){
  const requirements=(await client.query<{weekday:number;shift_template_id:string;position_id:string;start_time:string;end_time:string;min_count:number;ideal_count:number}>(`SELECT r.weekday,r.shift_template_id,r.position_id,t.start_time,t.end_time,r.min_count,r.ideal_count
    FROM staffing_requirements r JOIN shift_templates t ON t.id=r.shift_template_id JOIN positions p ON p.id=r.position_id
    WHERE r.store_id=$1 AND t.is_active=true AND p.is_active=true ORDER BY r.weekday,t.start_time`,[storeId])).rows;
  for(const requirement of requirements){
    const workDate=addDays(week,requirement.weekday-1);
    const interval=shiftInterval(workDate,requirement.start_time.slice(0,5),requirement.end_time.slice(0,5),timezone);
    await client.query(`INSERT INTO shift_slots (schedule_id,work_date,shift_template_id,position_id,start_at,end_at,min_count,ideal_count)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,[scheduleId,workDate,requirement.shift_template_id,requirement.position_id,interval.start,interval.end,requirement.min_count,requirement.ideal_count]);
  }
  return requirements.length;
}
