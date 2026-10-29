import type { PoolClient } from "pg";
import { approvedOverlapsShift } from "@/server/leave/scheduling-feed";

export async function conflictsWithApprovedLeave(client:PoolClient,userId:string,storeId:string,start:Date,end:Date):Promise<boolean>{
  return approvedOverlapsShift(client,userId,storeId,start,end);
}
