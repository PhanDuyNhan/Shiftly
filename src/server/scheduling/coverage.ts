import { getPool } from "@/db/client";
import { assertMonday,weekEnd } from "./time";
import { scheduleSlots } from "./schedules";
import { checkCandidate } from "./hard-constraints";

export async function coverage(storeId:string,week:string){
  assertMonday(week);
  const client=await getPool().connect();
  try{
    const schedule=(await client.query<{id:string}>("SELECT id FROM schedules WHERE store_id=$1 AND week_start=$2",[storeId,week])).rows[0];
    if(!schedule)return [];
    const slots=await scheduleSlots(client,schedule.id);
    const result=[];
    for(const slot of slots){
      const qualified=(await client.query<{id:string}>(`SELECT u.id FROM store_memberships m JOIN users u ON u.id=m.user_id
        JOIN user_positions up ON up.user_id=u.id WHERE m.store_id=$1 AND m.role_in_store='employee' AND m.left_at IS NULL
        AND u.status='active' AND up.position_id=$2`,[storeId,slot.position_id])).rows;
      const assigned=Number((await client.query<{count:string}>("SELECT count(*)::text AS count FROM shift_assignments WHERE slot_id=$1 AND status='assigned'",[slot.id])).rows[0].count);
      let available=0;
      for(const user of qualified){
        const already=await client.query("SELECT 1 FROM shift_assignments WHERE slot_id=$1 AND user_id=$2 AND status='assigned'",[slot.id,user.id]);
        if(already.rowCount)continue;
        if((await checkCandidate(client,user.id,slot)).length===0)available++;
      }
      const interested=Number((await client.query<{count:string}>(`SELECT count(*)::text AS count FROM shift_preferences
        WHERE store_id=$1 AND work_date=$2 AND shift_template_id=$3 AND preference>0`,
        [storeId,slot.work_date,slot.shift_template_id])).rows[0].count);
      result.push({slot_id:slot.id,work_date:slot.work_date,position_id:slot.position_id,shift_template_id:slot.shift_template_id,
        min_count:slot.min_count,ideal_count:slot.ideal_count,assigned_count:assigned,qualified_count:qualified.length,available_count:available,interested_count:interested});
    }
    return result;
  }finally{client.release();}
}
