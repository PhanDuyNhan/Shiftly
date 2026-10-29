import { getPool } from "@/db/client";
import type { Pool,PoolClient } from "pg";
import { HttpError } from "./errors";
import { preferencesSchema,validatePreferenceDates } from "./preference-validation";
import { assertMonday,registrationDeadline,weekEnd } from "./time";

export async function homeStore(userId:string,client:Pool|PoolClient=getPool()){
  const row=(await client.query<{store_id:string;store_name:string;timezone:string;registration_deadline_weekday:number;registration_deadline_time:string}>(`SELECT m.store_id,s.name AS store_name,s.timezone,ss.registration_deadline_weekday,ss.registration_deadline_time
    FROM store_memberships m JOIN stores s ON s.id=m.store_id JOIN store_settings ss ON ss.store_id=s.id
    WHERE m.user_id=$1 AND m.role_in_store='employee' AND m.left_at IS NULL AND s.is_active=true
    ORDER BY m.is_primary DESC,m.joined_at,m.id LIMIT 1`,[userId])).rows[0];
  if(!row)throw new HttpError(403,"forbidden","Active employee store required");
  return row;
}

export async function readPreferences(userId:string,week:string){
  assertMonday(week);
  const home=await homeStore(userId);
  const rows=(await getPool().query(`SELECT * FROM shift_preferences WHERE user_id=$1 AND store_id=$2 AND work_date BETWEEN $3 AND $4 ORDER BY work_date`,
    [userId,home.store_id,week,weekEnd(week)])).rows;
  return rows;
}

export async function replacePreferences(userId:string,week:string,value:unknown){
  assertMonday(week);
  const parsed=preferencesSchema.safeParse(value);
  if(!parsed.success||!validatePreferenceDates(week,parsed.data.preferences)) throw new HttpError(422,"invalid","Invalid shift preferences");
  const {preferences}=parsed.data;
  const client=await getPool().connect();
  try{
    await client.query("BEGIN");
    await client.query("SELECT id FROM users WHERE id=$1 FOR UPDATE",[userId]);
    const store=await homeStore(userId,client);
    const storeId=store.store_id;
    const deadline=registrationDeadline(week,store.registration_deadline_weekday,store.registration_deadline_time.slice(0,5),store.timezone);
    if(new Date()>deadline) throw new HttpError(409,"deadline_passed","Registration deadline has passed");
    for(const preference of preferences){
      const valid=await client.query(`SELECT 1 FROM shift_templates WHERE id=$1 AND store_id=$2 AND is_active=true`,[preference.shift_template_id,storeId]);
      if(!valid.rowCount) throw new HttpError(422,"invalid","Shift template is inactive or belongs to another store");
    }
    await client.query("DELETE FROM shift_preferences WHERE user_id=$1 AND store_id=$2 AND work_date BETWEEN $3 AND $4",[userId,storeId,week,weekEnd(week)]);
    for(const preference of preferences) await client.query(`INSERT INTO shift_preferences
      (user_id,store_id,work_date,shift_template_id,preference) VALUES ($1,$2,$3,$4,$5)`,
      [userId,storeId,preference.work_date,preference.shift_template_id,preference.preference]);
    await client.query("COMMIT");
    return {preferences:await readPreferences(userId,week),deadline:deadline.toISOString(),store:{id:storeId,name:store.store_name}};
  }catch(error){await client.query("ROLLBACK");throw error;}finally{client.release();}
}

export async function preferenceDeadline(storeId:string,week:string){
  assertMonday(week);
  const row=(await getPool().query<{timezone:string;registration_deadline_weekday:number;registration_deadline_time:string}>(`SELECT s.timezone,ss.registration_deadline_weekday,ss.registration_deadline_time
    FROM stores s JOIN store_settings ss ON ss.store_id=s.id WHERE s.id=$1`,[storeId])).rows[0];
  if(!row) throw new HttpError(404,"not_found","Store not found");
  return registrationDeadline(week,row.registration_deadline_weekday,row.registration_deadline_time.slice(0,5),row.timezone);
}
