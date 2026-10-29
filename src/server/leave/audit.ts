import type { PoolClient } from "pg";

export async function leaveAudit(client:PoolClient,actorId:string,storeId:string,action:string,id:string,before:unknown,after:unknown):Promise<void>{
  await client.query(`INSERT INTO audit_logs (actor_id,store_id,action,entity_type,entity_id,before_data,after_data)
    VALUES ($1,$2,$3,'leave_request',$4,$5,$6)`,[actorId,storeId,action,id,
      before==null?null:JSON.stringify(before),after==null?null:JSON.stringify(after)]);
}
