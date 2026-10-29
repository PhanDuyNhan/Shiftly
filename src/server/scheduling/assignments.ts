import type { PoolClient } from "pg";

export type AssignmentInterval={id:string;slot_id:string;user_id:string;start_at:Date;end_at:Date;store_id:string;is_pinned:boolean;status:string};

export async function activeAssignments(client:PoolClient,userId:string,from:Date,to:Date):Promise<AssignmentInterval[]>{
  return (await client.query<AssignmentInterval>(`SELECT a.id,a.slot_id,a.user_id,a.start_at,a.end_at,a.is_pinned,a.status,s.store_id
    FROM shift_assignments a JOIN shift_slots sl ON sl.id=a.slot_id JOIN schedules s ON s.id=sl.schedule_id
    WHERE a.user_id=$1 AND a.status='assigned' AND a.start_at<$3 AND a.end_at>$2 ORDER BY a.start_at`,[userId,from,to])).rows;
}
