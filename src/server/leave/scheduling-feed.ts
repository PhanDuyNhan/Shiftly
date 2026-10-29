import { approvedIntervals } from "./approved-intervals";
import { overlaps } from "./date-interval";
import type { PoolClient } from "pg";

export async function hasApprovedLeave(userId:string,storeId:string,weekStart:string,weekEnd:string,shift:{start:Date;end:Date}):Promise<boolean>{
  return (await approvedIntervals(userId,storeId,weekStart,weekEnd)).some((interval)=>overlaps(interval,shift));
}

// Scheduling calls this after locking the user row, using its own transaction.
export async function approvedOverlapsShift(client:PoolClient,userId:string,_storeId:string,start:Date,end:Date):Promise<boolean>{
  const result=await client.query(`SELECT 1 FROM leave_requests r JOIN stores s ON s.id=r.store_id
    WHERE r.user_id=$1 AND r.status='approved'
      AND tstzrange($2::timestamptz,$3::timestamptz,'[)') && tstzrange(
        r.start_date::timestamp AT TIME ZONE s.timezone,
        (r.end_date+1)::timestamp AT TIME ZONE s.timezone,'[)') LIMIT 1`,[userId,start,end]);
  return !!result.rowCount;
}
