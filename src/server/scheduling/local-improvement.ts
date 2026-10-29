import type { Candidate } from "./greedy";
import type { PoolClient } from "pg";
import { checkCandidate,type Slot } from "./hard-constraints";

// Bounded balancing pass used after each greedy choice: candidates with the
// largest target-hour deficit are tried first when preference scores tie.
export function improveCandidateOrder(candidates:Candidate[],limitMs=10):Candidate[]{
  const deadline=performance.now()+limitMs;
  const ordered=[...candidates];
  for(let i=0;i<ordered.length&&performance.now()<deadline;i++){
    for(let j=i+1;j<ordered.length&&performance.now()<deadline;j++){
      const a=ordered[i].target_hours_week-ordered[i].assigned_hours;
      const b=ordered[j].target_hours_week-ordered[j].assigned_hours;
      if(b>a)[ordered[i],ordered[j]]=[ordered[j],ordered[i]];
    }
  }
  return ordered;
}

export async function tryLocalSwaps(client:PoolClient,slots:Slot[],preferences:Map<string,number>,limitMs=250):Promise<number>{
  const deadline=performance.now()+limitMs;
  const slotMap=new Map(slots.map((slot)=>[slot.id,slot]));
  const assignments=(await client.query<{id:string;slot_id:string;user_id:string}>(`SELECT a.id,a.slot_id,a.user_id FROM shift_assignments a
    JOIN shift_slots sl ON sl.id=a.slot_id WHERE sl.schedule_id=$1 AND a.status='assigned' AND a.is_pinned=false ORDER BY a.id`,[slots[0]?.schedule_id??null])).rows;
  const pref=(userId:string,slot:Slot)=>preferences.get(`${userId}:${slot.work_date}:${slot.shift_template_id}`)??0;
  let swaps=0;
  for(let i=0;i<assignments.length&&performance.now()<deadline;i++)for(let j=i+1;j<assignments.length&&performance.now()<deadline;j++){
    const a=assignments[i],b=assignments[j];
    if(a.user_id===b.user_id||a.slot_id===b.slot_id)continue;
    const slotA=slotMap.get(a.slot_id),slotB=slotMap.get(b.slot_id);
    if(!slotA||!slotB)continue;
    if(pref(b.user_id,slotA)+pref(a.user_id,slotB)<=pref(a.user_id,slotA)+pref(b.user_id,slotB))continue;
    await client.query("SAVEPOINT local_swap");
    try{
      await client.query("UPDATE shift_assignments SET status='cancelled' WHERE id=ANY($1::uuid[])",[[a.id,b.id]]);
      const issuesA=await checkCandidate(client,b.user_id,slotA);
      const issuesB=await checkCandidate(client,a.user_id,slotB);
      if(issuesA.length||issuesB.length){await client.query("ROLLBACK TO SAVEPOINT local_swap");continue;}
      await client.query("UPDATE shift_assignments SET user_id=$2,status='assigned' WHERE id=$1",[a.id,b.user_id]);
      await client.query("UPDATE shift_assignments SET user_id=$2,status='assigned' WHERE id=$1",[b.id,a.user_id]);
      [a.user_id,b.user_id]=[b.user_id,a.user_id];
      swaps++;
    }catch{
      await client.query("ROLLBACK TO SAVEPOINT local_swap");
    }finally{
      await client.query("RELEASE SAVEPOINT local_swap");
    }
  }
  return swaps;
}
