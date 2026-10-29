import type { PoolClient } from "pg";
import { markNeedsCover } from "@/server/scheduling/needs-cover";

export async function applyApprovedLeave(client:PoolClient,leave:{id:string;user_id:string;store_id:string;start_date:string;end_date:string},reviewedAt:Date){
  return markNeedsCover(client,leave,reviewedAt);
}
