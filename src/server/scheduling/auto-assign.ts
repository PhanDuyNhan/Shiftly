import { getPool } from "@/db/client";
import { requireStoreRole,type Principal } from "./access";
import { lockUsers } from "./concurrency";
import { scheduleAudit } from "./audit";
import { explainMissing,type SlotWarning } from "./candidate-explanations";
import { HttpError } from "./errors";
import { checkCandidate,type Violation } from "./hard-constraints";
import { orderSlots,scoreCandidate,type Candidate } from "./greedy";
import { improveCandidateOrder,tryLocalSwaps } from "./local-improvement";
import { scheduleById,scheduleSlots } from "./schedules";
import { validateSchedule } from "./validate-schedule";

export async function autoAssign(principal:Principal,scheduleId:string){
  const pool=getPool();
  const initial=(await pool.query<{store_id:string}>("SELECT store_id FROM schedules WHERE id=$1",[scheduleId])).rows[0];
  if(!initial)throw new HttpError(404,"not_found","Schedule not found");
  await requireStoreRole(principal,initial.store_id,"manager");
  const client=await pool.connect();
  const started=performance.now();
  try{
    await client.query("BEGIN");
    const rawCandidates=(await client.query<{id:string;target_hours_week:string|null}>(`SELECT u.id,m.target_hours_week
      FROM store_memberships m JOIN users u ON u.id=m.user_id
      WHERE m.store_id=$1 AND m.role_in_store='employee' AND m.left_at IS NULL AND u.status='active' ORDER BY u.id`,[initial.store_id])).rows;
    await lockUsers(client,rawCandidates.map((row)=>row.id));
    const schedule=await scheduleById(client,scheduleId,true);
    if(schedule.status!=="draft")throw new HttpError(409,"conflict","Only drafts can be automatically assigned");
    await client.query(`DELETE FROM shift_assignments a USING shift_slots sl
      WHERE a.slot_id=sl.id AND sl.schedule_id=$1 AND a.is_pinned=false`,[scheduleId]);
    const pinnedCheck=await validateSchedule(client,scheduleId);
    if(pinnedCheck.violations.length)throw new HttpError(409,"pinned_conflict","Pinned assignments conflict with current data",{violations:pinnedCheck.violations});
    const slots=await scheduleSlots(client,scheduleId);
    const skills=(await client.query<{position_id:string;count:string}>(`SELECT up.position_id,count(*)::text AS count FROM user_positions up
      JOIN store_memberships m ON m.user_id=up.user_id JOIN users u ON u.id=up.user_id
      WHERE m.store_id=$1 AND m.role_in_store='employee' AND m.left_at IS NULL AND u.status='active' GROUP BY up.position_id`,[schedule.store_id])).rows;
    const skillCounts=new Map(skills.map((row)=>[row.position_id,Number(row.count)]));
    const candidates:Candidate[]=rawCandidates.map((row)=>({id:row.id,target_hours_week:Number(row.target_hours_week??0),assigned_hours:0}));
    const preferences=(await client.query<{user_id:string;work_date:string;shift_template_id:string;preference:number}>(`SELECT user_id,work_date,shift_template_id,preference FROM shift_preferences
      WHERE store_id=$1 AND work_date BETWEEN $2 AND $2::date+6`,[schedule.store_id,schedule.week_start])).rows;
    const preferenceMap=new Map(preferences.map((row)=>[`${row.user_id}:${row.work_date}:${row.shift_template_id}`,row.preference]));
    const warnings:SlotWarning[]=[];
    let assignedCount=0;
    for(const slot of orderSlots(slots,skillCounts)){
      let current=Number((await client.query<{count:string}>(`SELECT count(*)::text AS count FROM shift_assignments WHERE slot_id=$1 AND status='assigned'`,[slot.id])).rows[0].count);
      const rejections:Violation[][]=[];
      while(current<slot.ideal_count){
        const eligible:{candidate:Candidate;score:number}[]=[];
        for(const candidate of improveCandidateOrder(candidates)){
          const already=await client.query("SELECT 1 FROM shift_assignments WHERE slot_id=$1 AND user_id=$2 AND status='assigned'",[slot.id,candidate.id]);
          if(already.rowCount)continue;
          const issues=await checkCandidate(client,candidate.id,slot);
          if(issues.length){rejections.push(issues);continue;}
          const preference=preferenceMap.get(`${candidate.id}:${slot.work_date}:${slot.shift_template_id}`)??0;
          eligible.push({candidate,score:scoreCandidate(candidate,preference)});
        }
        if(!eligible.length)break;
        eligible.sort((a,b)=>b.score-a.score||a.candidate.id.localeCompare(b.candidate.id));
        const chosen=eligible[0].candidate;
        await client.query(`INSERT INTO shift_assignments (slot_id,user_id,start_at,end_at,source,created_by)
          VALUES ($1,$2,$3,$4,'auto',$5)`,[slot.id,chosen.id,slot.start_at,slot.end_at,principal.id]);
        chosen.assigned_hours+=(slot.end_at.getTime()-slot.start_at.getTime())/3_600_000;
        assignedCount++;current++;
      }
      if(current<slot.min_count)warnings.push(explainMissing(slot.id,slot.min_count-current,rejections));
    }
    const swaps=await tryLocalSwaps(client,slots,preferenceMap);
    const hours=(await client.query<{user_id:string;hours:string}>(`SELECT a.user_id,
      (sum(extract(epoch FROM (a.end_at-a.start_at)))/3600)::text AS hours
      FROM shift_assignments a JOIN shift_slots sl ON sl.id=a.slot_id
      WHERE sl.schedule_id=$1 AND a.status='assigned' GROUP BY a.user_id`,[scheduleId])).rows;
    const hoursMap=new Map(hours.map((row)=>[row.user_id,Number(row.hours)]));
    const fairness={swaps,users:candidates.map((candidate)=>({user_id:candidate.id,
      target_hours_week:candidate.target_hours_week,assigned_hours:hoursMap.get(candidate.id)??0}))};
    const runtimeMs=Math.round(performance.now()-started);
    const run=(await client.query(`INSERT INTO schedule_runs
      (schedule_id,algorithm,status,score,runtime_ms,unfilled_slots,warnings,fairness,triggered_by,finished_at)
      VALUES ($1,'greedy','succeeded',$2,$3,$4,$5,$6,$7,now()) RETURNING *`,
      [scheduleId,assignedCount-warnings.reduce((sum,item)=>sum+item.missing_count,0),runtimeMs,warnings.length,JSON.stringify(warnings),JSON.stringify(fairness),principal.id])).rows[0];
    await scheduleAudit(client,principal.id,schedule.store_id,"schedule.auto_assign","schedule",scheduleId,null,{run_id:run.id,assigned_count:assignedCount,swaps,warnings});
    await client.query("COMMIT");
    return {schedule_id:scheduleId,run,warnings,assigned_count:assignedCount};
  }catch(error){await client.query("ROLLBACK");throw error;}finally{client.release();}
}
