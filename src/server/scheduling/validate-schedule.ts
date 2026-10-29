import type { PoolClient } from "pg";
import { scheduleSlots } from "./schedules";
import { checkCandidate,type Violation } from "./hard-constraints";

export async function validateSchedule(client:PoolClient,scheduleId:string){
  const slots=await scheduleSlots(client,scheduleId);
  const violations:{slot_id:string;assignment_id:string;user_id:string;issues:Violation[]}[]=[];
  const warnings:{slot_id:string;missing_count:number;code:string}[]=[];
  for(const slot of slots){
    const assigned=(await client.query<{id:string;user_id:string}>(`SELECT id,user_id FROM shift_assignments WHERE slot_id=$1 AND status='assigned'`,[slot.id])).rows;
    if(assigned.length<slot.min_count)warnings.push({slot_id:slot.id,missing_count:slot.min_count-assigned.length,code:"insufficient_staff"});
    for(const assignment of assigned){
      const issues=await checkCandidate(client,assignment.user_id,slot,assignment.id);
      if(issues.length)violations.push({slot_id:slot.id,assignment_id:assignment.id,user_id:assignment.user_id,issues});
    }
  }
  return {violations,warnings};
}
