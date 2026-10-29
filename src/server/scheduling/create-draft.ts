import { getPool } from "@/db/client";
import { requireStoreRole,type Principal } from "./access";
import { scheduleAudit } from "./audit";
import { HttpError } from "./errors";
import { createSlotsForSchedule } from "./slots";
import { assertMonday } from "./time";

export async function createDraft(principal:Principal,storeId:string,week:string){
  await requireStoreRole(principal,storeId,"manager");assertMonday(week);
  const client=await getPool().connect();
  try{
    await client.query("BEGIN");
    const store=(await client.query<{timezone:string}>("SELECT timezone FROM stores WHERE id=$1 AND is_active=true",[storeId])).rows[0];
    if(!store)throw new HttpError(422,"invalid","Store is inactive");
    const schedule=(await client.query(`INSERT INTO schedules (store_id,week_start,created_by)
      VALUES ($1,$2,$3) RETURNING *`,[storeId,week,principal.id])).rows[0];
    const slotCount=await createSlotsForSchedule(client,schedule.id,storeId,week,store.timezone);
    await scheduleAudit(client,principal.id,storeId,"schedule.create","schedule",schedule.id,null,schedule);
    await client.query("COMMIT");
    return {schedule,slot_count:slotCount};
  }catch(error){await client.query("ROLLBACK");throw error;}finally{client.release();}
}
