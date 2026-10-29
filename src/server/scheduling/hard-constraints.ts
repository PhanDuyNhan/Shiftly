import type { PoolClient } from "pg";
import { localMidnightUtc } from "@/server/leave/date-interval";
import { isBusy } from "./availability-resolver";
import { activeAssignments } from "./assignments";
import { conflictsWithApprovedLeave } from "./leave-eligibility";
import { addDays,weekEnd } from "./time";

export type Slot={id:string;schedule_id:string;work_date:string;start_at:Date;end_at:Date;shift_template_id:string;position_id:string;ideal_count:number;min_count:number;store_id:string;timezone:string;week_start:string};
export type Violation={code:string;message:string};
const durationHours=(start:Date,end:Date)=>Math.max(0,(end.getTime()-start.getTime())/3_600_000);

export async function checkCandidate(client:PoolClient,userId:string,slot:Slot,ignoreAssignmentId?:string):Promise<Violation[]>{
  const violations:Violation[]=[];
  const member=(await client.query<{max_hours_week:string;timezone:string}>(`SELECT m.max_hours_week,home.timezone FROM store_memberships m
    JOIN users u ON u.id=m.user_id JOIN stores home ON home.id=m.store_id
    JOIN stores destination ON destination.id=$2
    WHERE m.user_id=$1 AND m.role_in_store='employee' AND m.left_at IS NULL
      AND u.status='active' AND home.is_active=true AND destination.is_active=true
    ORDER BY m.is_primary DESC LIMIT 1`,[userId,slot.store_id])).rows[0];
  if(!member) return [{code:"membership",message:"Employee has no active home store"}];
  const skill=await client.query("SELECT 1 FROM user_positions WHERE user_id=$1 AND position_id=$2 AND skill_level BETWEEN 1 AND 5",[userId,slot.position_id]);
  if(!skill.rowCount) violations.push({code:"skill",message:"Position skill is missing"});
  if(await conflictsWithApprovedLeave(client,userId,slot.store_id,slot.start_at,slot.end_at)) violations.push({code:"leave",message:"Approved leave overlaps shift"});
  if(await isBusy(client,userId,{start:slot.start_at,end:slot.end_at},member.timezone)) violations.push({code:"busy",message:"Employee is unavailable"});
  const from=localMidnightUtc(addDays(slot.week_start,-1),slot.timezone);
  const to=localMidnightUtc(addDays(weekEnd(slot.week_start),2),slot.timezone);
  const existing=(await activeAssignments(client,userId,from,to)).filter((a)=>a.id!==ignoreAssignmentId);
  if(existing.some((a)=>a.start_at<slot.end_at&&slot.start_at<a.end_at)) violations.push({code:"overlap",message:"Shift overlaps an assignment"});
  const relatedStores=new Set([slot.store_id,...existing.map((a)=>a.store_id)]);
  const relatedPolicies=(await client.query<{store_id:string;max_hours_day:string;min_rest_hours:string;require_weekly_day_off:boolean}>(`SELECT store_id,max_hours_day,min_rest_hours,require_weekly_day_off
    FROM store_settings WHERE store_id=ANY($1::uuid[])`,[[...relatedStores]])).rows;
  const dailyMax=Math.min(...relatedPolicies.map((p)=>Number(p.max_hours_day)));
  const weeklyMax=Number(member.max_hours_week);
  const minRest=Math.max(...relatedPolicies.map((p)=>Number(p.min_rest_hours)));
  for(let date=slot.work_date;date<=addDays(slot.work_date,1);date=addDays(date,1)){
    const dayStart=localMidnightUtc(date,slot.timezone),dayEnd=localMidnightUtc(addDays(date,1),slot.timezone);
    const clip=(start:Date,end:Date)=>durationHours(new Date(Math.max(start.getTime(),dayStart.getTime())),new Date(Math.min(end.getTime(),dayEnd.getTime())));
    const total=clip(slot.start_at,slot.end_at)+existing.reduce((sum,a)=>sum+clip(a.start_at,a.end_at),0);
    if(total>dailyMax+0.0001){violations.push({code:"daily_hours",message:"Daily hour limit exceeded"});break;}
  }
  const weekStart=localMidnightUtc(slot.week_start,slot.timezone),weekFinish=localMidnightUtc(addDays(slot.week_start,7),slot.timezone);
  const weekHours=durationHours(new Date(Math.max(slot.start_at.getTime(),weekStart.getTime())),new Date(Math.min(slot.end_at.getTime(),weekFinish.getTime())))+
    existing.reduce((sum,a)=>sum+durationHours(new Date(Math.max(a.start_at.getTime(),weekStart.getTime())),new Date(Math.min(a.end_at.getTime(),weekFinish.getTime()))),0);
  if(weekHours>weeklyMax+0.0001) violations.push({code:"weekly_hours",message:"Weekly hour limit exceeded"});
  if(existing.some((a)=>{
    const gap=a.end_at<=slot.start_at?durationHours(a.end_at,slot.start_at):slot.end_at<=a.start_at?durationHours(slot.end_at,a.start_at):0;
    return gap>0&&gap<minRest;
  })) violations.push({code:"rest",message:"Minimum rest between shifts violated"});
  if(relatedPolicies.some((p)=>p.require_weekly_day_off)){
    const intervals=[...existing.map((a)=>({start:a.start_at,end:a.end_at})),{start:slot.start_at,end:slot.end_at}]
      .filter((a)=>a.start<weekFinish&&a.end>weekStart).sort((a,b)=>a.start.getTime()-b.start.getTime());
    let cursor=weekStart.getTime(),hasDayOff=false;
    for(const item of intervals){if(item.start.getTime()-cursor>=24*3_600_000)hasDayOff=true;cursor=Math.max(cursor,item.end.getTime());}
    if(weekFinish.getTime()-cursor>=24*3_600_000)hasDayOff=true;
    if(!hasDayOff) violations.push({code:"weekly_day_off",message:"No continuous 24-hour break in week"});
  }
  const filled=(await client.query<{count:string}>("SELECT count(*)::text AS count FROM shift_assignments WHERE slot_id=$1 AND status='assigned' AND id IS DISTINCT FROM $2::uuid",[slot.id,ignoreAssignmentId??null])).rows[0];
  if(Number(filled.count)>=slot.ideal_count) violations.push({code:"capacity",message:"Slot is full"});
  return violations;
}
