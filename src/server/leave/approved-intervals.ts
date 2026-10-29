import { getPool } from "@/db/client";
import { leaveInterval } from "./date-interval";
import { assertDateRange } from "./date-range";

export async function approvedIntervals(userId:string,storeId:string,weekStart:string,weekEnd:string){
  assertDateRange(weekStart,weekEnd);
  const rows=(await getPool().query<{id:string;start_date:string;end_date:string;timezone:string}>(`SELECT r.id,r.start_date,r.end_date,s.timezone
    FROM leave_requests r JOIN stores s ON s.id=r.store_id
    WHERE r.user_id=$1 AND r.store_id=$2 AND r.status='approved'
    AND r.start_date<=$4 AND r.end_date>=$3`,[userId,storeId,weekStart,weekEnd])).rows;
  return rows.map((row)=>({leaveRequestId:row.id,...leaveInterval(row.start_date,row.end_date,row.timezone)}));
}
