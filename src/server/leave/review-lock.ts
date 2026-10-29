import type { PoolClient } from "pg";
import { lockUsers } from "@/server/scheduling/concurrency";

export async function lockLeaveUser(client:PoolClient,userId:string):Promise<void>{
  await lockUsers(client,[userId]);
}
