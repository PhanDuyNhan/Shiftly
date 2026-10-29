import type { PoolClient } from "pg";

export async function lockUsers(client:PoolClient,userIds:string[]):Promise<void>{
  for(const id of [...new Set(userIds)].sort()){
    const result=await client.query("SELECT id FROM users WHERE id=$1 FOR UPDATE",[id]);
    if(!result.rowCount) throw new Error(`User ${id} is missing`);
  }
}
