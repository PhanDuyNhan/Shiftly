import type { PoolClient } from "pg";
export async function scheduleAudit(client:PoolClient,actorId:string,storeId:string,action:string,entityType:string,entityId:string,before:unknown,after:unknown):Promise<void>{
  await client.query(`INSERT INTO audit_logs (actor_id,store_id,action,entity_type,entity_id,before_data,after_data)
    VALUES ($1,$2,$3,$4,$5,$6,$7)`,[actorId,storeId,action,entityType,entityId,before==null?null:JSON.stringify(before),after==null?null:JSON.stringify(after)]);
}
