import { getPool } from "@/db/client";
import { HttpError } from "./errors";
import { rulesSchema,exceptionSchema } from "./availability-validation";

export async function readRules(userId:string){return (await getPool().query("SELECT * FROM availability_rules WHERE user_id=$1 ORDER BY weekday,start_time",[userId])).rows;}

export async function replaceRules(userId:string,value:unknown){
  const parsed=rulesSchema.safeParse(value);
  if(!parsed.success) throw new HttpError(422,"invalid","Invalid availability rules",{issues:parsed.error.issues});
  const rules=parsed.data.rules;
  for(let i=0;i<rules.length;i++)for(let j=i+1;j<rules.length;j++){
    const a=rules[i],b=rules[j];
    if(a.weekday===b.weekday&&a.start_time<b.end_time&&b.start_time<a.end_time&&
      (a.valid_to??"9999-12-31")>=b.valid_from&&(b.valid_to??"9999-12-31")>=a.valid_from)
      throw new HttpError(422,"invalid","Overlapping availability rules");
  }
  const client=await getPool().connect();
  try{
    await client.query("BEGIN");
    await client.query("SELECT id FROM users WHERE id=$1 FOR UPDATE",[userId]);
    await client.query("DELETE FROM availability_rules WHERE user_id=$1",[userId]);
    for(const rule of rules) await client.query(`INSERT INTO availability_rules
      (user_id,weekday,start_time,end_time,kind,valid_from,valid_to,reason) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [userId,rule.weekday,rule.start_time,rule.end_time,rule.kind,rule.valid_from,rule.valid_to??null,rule.reason??null]);
    await client.query("COMMIT");
  }catch(error){await client.query("ROLLBACK");throw error;}finally{client.release();}
  return readRules(userId);
}

export async function readExceptions(userId:string,from:string,to:string){
  return (await getPool().query(`SELECT * FROM availability_exceptions WHERE user_id=$1 AND on_date BETWEEN $2 AND $3 ORDER BY on_date,start_time`,[userId,from,to])).rows;
}
export async function addException(userId:string,value:unknown){
  const parsed=exceptionSchema.safeParse(value);
  if(!parsed.success) throw new HttpError(422,"invalid","Invalid availability exception",{issues:parsed.error.issues});
  const item=parsed.data;
  const result=await getPool().query(`INSERT INTO availability_exceptions (user_id,on_date,start_time,end_time,kind,reason)
    VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,[userId,item.on_date,item.start_time??null,item.end_time??null,item.kind,item.reason??null]);
  return result.rows[0];
}
export async function deleteException(userId:string,id:string){
  const result=await getPool().query("DELETE FROM availability_exceptions WHERE id=$1 AND user_id=$2 RETURNING id",[id,userId]);
  if(!result.rowCount) throw new HttpError(404,"not_found","Exception not found");
}
