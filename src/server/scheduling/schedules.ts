import type { PoolClient } from "pg";
import { getPool } from "@/db/client";
import { requireStoreRole,type Principal } from "./access";
import { HttpError } from "./errors";
import { assertMonday } from "./time";
import type { Slot } from "./hard-constraints";

export type ScheduleRow={id:string;store_id:string;week_start:string;status:string;version:number;created_by:string;published_at:Date|null};

export async function scheduleById(client:PoolClient,id:string,lock=false):Promise<ScheduleRow>{
  const result=await client.query<ScheduleRow>(`SELECT * FROM schedules WHERE id=$1 ${lock?"FOR UPDATE":""}`,[id]);
  if(!result.rows[0]) throw new HttpError(404,"not_found","Schedule not found");
  return result.rows[0];
}

export async function scheduleSlots(client:PoolClient,scheduleId:string):Promise<Slot[]>{
  return (await client.query<Slot>(`SELECT sl.*,s.store_id,s.week_start,st.timezone
    FROM shift_slots sl JOIN schedules s ON s.id=sl.schedule_id JOIN stores st ON st.id=s.store_id
    WHERE sl.schedule_id=$1 ORDER BY sl.start_at,sl.id`,[scheduleId])).rows;
}

export async function readSchedule(principal:Principal,storeId:string,week:string){
  await requireStoreRole(principal,storeId,"manager");assertMonday(week);
  const pool=getPool();
  const schedule=(await pool.query<ScheduleRow>("SELECT * FROM schedules WHERE store_id=$1 AND week_start=$2",[storeId,week])).rows[0];
  if(!schedule)return null;
  const [slots,assignments,runs]=await Promise.all([
    pool.query(`SELECT sl.* FROM shift_slots sl WHERE schedule_id=$1 ORDER BY start_at`,[schedule.id]),
    pool.query(`SELECT a.* FROM shift_assignments a JOIN shift_slots sl ON sl.id=a.slot_id WHERE sl.schedule_id=$1 ORDER BY a.start_at`,[schedule.id]),
    pool.query("SELECT * FROM schedule_runs WHERE schedule_id=$1 ORDER BY started_at DESC LIMIT 10",[schedule.id]),
  ]);
  return {...schedule,slots:slots.rows,assignments:assignments.rows,runs:runs.rows};
}

