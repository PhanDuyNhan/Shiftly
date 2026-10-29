import type { Slot } from "./hard-constraints";

export type Candidate={id:string;target_hours_week:number;assigned_hours:number};
export function orderSlots(slots:Slot[],skillCounts:Map<string,number>):Slot[]{
  return [...slots].sort((a,b)=>(skillCounts.get(a.position_id)??0)-(skillCounts.get(b.position_id)??0)
    || b.min_count-a.min_count || a.start_at.getTime()-b.start_at.getTime());
}
export function scoreCandidate(candidate:Candidate,preference:number):number{
  const deficit=Math.max(0,candidate.target_hours_week-candidate.assigned_hours);
  return preference*20+deficit-Math.max(0,candidate.assigned_hours-candidate.target_hours_week)*2;
}
