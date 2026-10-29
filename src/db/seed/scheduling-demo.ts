import { loadEnvConfig } from "@next/env";
import { getPool } from "../client";
import { hashPassword } from "../../server/auth/password";
import { shiftInterval } from "../../server/scheduling/time";

loadEnvConfig(process.cwd());

async function main(){
  const password=process.env.DEMO_PASSWORD;
  if(!password)throw new Error("Set DEMO_PASSWORD (at least 12 characters) for demo accounts");
  const client=await getPool().connect();
  try{
    await client.query("BEGIN");
    const store=async(code:string,name:string)=>{
      await client.query("INSERT INTO stores (code,name) VALUES ($1,$2) ON CONFLICT (code) DO NOTHING",[code,name]);
      const row=(await client.query<{id:string}>("SELECT id FROM stores WHERE code=$1",[code])).rows[0];
      await client.query("INSERT INTO store_settings (store_id) VALUES ($1) ON CONFLICT DO NOTHING",[row.id]);
      return row.id;
    };
    const storeA=await store("DEMO-A","Demo Store A"),storeB=await store("DEMO-B","Demo Store B");
    await client.query("INSERT INTO positions (name) VALUES ('Demo Barista') ON CONFLICT (name) DO NOTHING");
    const positionId=(await client.query<{id:string}>("SELECT id FROM positions WHERE name='Demo Barista'")).rows[0].id;
    await client.query("INSERT INTO positions (name) VALUES ('Demo Cashier') ON CONFLICT (name) DO NOTHING");
    const cashierId=(await client.query<{id:string}>("SELECT id FROM positions WHERE name='Demo Cashier'")).rows[0].id;
    const user=async(email:string,name:string)=>{
      await client.query(`INSERT INTO users (email,password_hash,must_change_password) VALUES ($1,$2,true)
        ON CONFLICT (email) DO NOTHING`,[email,await hashPassword(password)]);
      const row=(await client.query<{id:string}>("SELECT id FROM users WHERE email=$1",[email])).rows[0];
      await client.query("INSERT INTO employee_profiles (user_id,full_name) VALUES ($1,$2) ON CONFLICT (user_id) DO NOTHING",[row.id,name]);
      return row.id;
    };
    const managerA=await user("demo-manager-a@shiftly.test","Demo Manager A");
    const managerB=await user("demo-manager-b@shiftly.test","Demo Manager B");
    const linh=await user("demo-linh@shiftly.test","Demo Linh");
    const minh=await user("demo-minh@shiftly.test","Demo Minh");
    const mai=await user("demo-mai@shiftly.test","Demo Mai");
    const an=await user("demo-an@shiftly.test","Demo An");
    const binh=await user("demo-binh@shiftly.test","Demo Binh");
    const ha=await user("demo-ha@shiftly.test","Demo Ha");
    const member=async(userId:string,storeId:string,role:string,maxHours=48)=>client.query(`INSERT INTO store_memberships
      (user_id,store_id,role_in_store,target_hours_week,max_hours_week,is_primary,managed_by)
      VALUES ($1,$2,$3,32,$4,$5,$6) ON CONFLICT (user_id,store_id) DO NOTHING`,
      [userId,storeId,role,maxHours,role==="employee",role==="employee"?(storeId===storeA?managerA:managerB):null]);
    await member(managerA,storeA,"manager");await member(managerB,storeB,"manager");
    await member(linh,storeA,"employee");await member(minh,storeA,"employee");
    await member(mai,storeA,"employee");await member(an,storeA,"employee");await member(binh,storeA,"employee",8);await member(ha,storeA,"employee");
    await client.query(`UPDATE store_memberships SET managed_by=$2,is_primary=true
      WHERE store_id=$1 AND user_id=ANY($3::uuid[]) AND role_in_store='employee'`,[storeA,managerA,[linh,minh,mai,an,binh,ha]]);
    await client.query(`UPDATE store_memberships SET target_hours_week=6
      WHERE store_id=$1 AND user_id=ANY($2::uuid[])`,[storeA,[linh,minh,mai,an,binh]]);
    await client.query(`UPDATE store_memberships SET target_hours_week=0
      WHERE store_id=$1 AND user_id=ANY($2::uuid[])`,[storeA,[managerA,ha]]);
    for(const [id,position] of [[linh,positionId],[minh,positionId],[mai,positionId],[an,cashierId],[binh,cashierId]] as const)
      await client.query(`INSERT INTO user_positions (user_id,position_id,skill_level)
        VALUES ($1,$2,3) ON CONFLICT (user_id,position_id) DO NOTHING`,[id,position]);
    const template=async(storeId:string,name:string,start:string,end:string)=>{
      await client.query(`INSERT INTO shift_templates (store_id,name,start_time,end_time)
        VALUES ($1,$2,$3,$4) ON CONFLICT (store_id,name) DO NOTHING`,[storeId,name,start,end]);
      return (await client.query<{id:string}>("SELECT id FROM shift_templates WHERE store_id=$1 AND name=$2",[storeId,name])).rows[0].id;
    };
    const night=await template(storeA,"Demo Night","22:00","06:00");
    const sunday=await template(storeA,"Demo Sunday","09:00","13:00");
    const thursday=await template(storeB,"Demo Thursday","14:00","18:00");
    const morning=await template(storeA,"Demo Morning","08:00","14:00");
    const afternoon=await template(storeA,"Demo Afternoon","14:00","20:00");
    for(const [storeId,day,templateId] of [[storeA,6,night],[storeA,7,sunday],[storeB,4,thursday]] as const){
      await client.query(`INSERT INTO staffing_requirements
        (store_id,weekday,shift_template_id,position_id,min_count,ideal_count)
        VALUES ($1,$2,$3,$4,1,1) ON CONFLICT (store_id,weekday,shift_template_id,position_id) DO NOTHING`,
        [storeId,day,templateId,positionId]);
    }
    for(const [day,templateId,skillId] of [[1,morning,positionId],[1,morning,cashierId],[2,afternoon,positionId]] as const)
      await client.query(`INSERT INTO staffing_requirements
        (store_id,weekday,shift_template_id,position_id,min_count,ideal_count)
        VALUES ($1,$2,$3,$4,1,1) ON CONFLICT (store_id,weekday,shift_template_id,position_id) DO NOTHING`,
        [storeA,day,templateId,skillId]);
    const schedule=async(storeId:string,createdBy:string)=>{
      await client.query(`INSERT INTO schedules (store_id,week_start,created_by)
        VALUES ($1,'2026-11-02',$2) ON CONFLICT (store_id,week_start) DO NOTHING`,[storeId,createdBy]);
      return (await client.query<{id:string}>("SELECT id FROM schedules WHERE store_id=$1 AND week_start='2026-11-02'",[storeId])).rows[0].id;
    };
    const scheduleA=await schedule(storeA,managerA),scheduleB=await schedule(storeB,managerB);
    await client.query(`INSERT INTO schedules (store_id,week_start,created_by)
      VALUES ($1,'2026-11-09',$2) ON CONFLICT (store_id,week_start) DO NOTHING`,[storeA,managerA]);
    const feasibleSchedule=(await client.query<{id:string}>("SELECT id FROM schedules WHERE store_id=$1 AND week_start='2026-11-09'",[storeA])).rows[0].id;
    const slot=async(scheduleId:string,date:string,templateId:string,start:string,end:string)=>{
      const interval=shiftInterval(date,start,end,"Asia/Ho_Chi_Minh");
      await client.query(`INSERT INTO shift_slots (schedule_id,work_date,shift_template_id,position_id,start_at,end_at,min_count,ideal_count)
        VALUES ($1,$2,$3,$4,$5,$6,1,1)
        ON CONFLICT (schedule_id,work_date,shift_template_id,position_id) DO NOTHING`,
        [scheduleId,date,templateId,positionId,interval.start,interval.end]);
      return (await client.query<{id:string;start_at:Date;end_at:Date}>(`SELECT id,start_at,end_at FROM shift_slots
        WHERE schedule_id=$1 AND work_date=$2 AND shift_template_id=$3 AND position_id=$4`,
        [scheduleId,date,templateId,positionId])).rows[0];
    };
    const nightSlot=await slot(scheduleA,"2026-11-07",night,"22:00","06:00");
    await slot(scheduleA,"2026-11-08",sunday,"09:00","13:00");
    const otherSlot=await slot(scheduleB,"2026-11-05",thursday,"14:00","18:00");
    const feasibleBarista=shiftInterval("2026-11-09","08:00","14:00","Asia/Ho_Chi_Minh");
    for(const skillId of [positionId,cashierId])await client.query(`INSERT INTO shift_slots
      (schedule_id,work_date,shift_template_id,position_id,start_at,end_at,min_count,ideal_count)
      VALUES ($1,'2026-11-09',$2,$3,$4,$5,1,1)
      ON CONFLICT (schedule_id,work_date,shift_template_id,position_id) DO NOTHING`,
      [feasibleSchedule,morning,skillId,feasibleBarista.start,feasibleBarista.end]);
    for(const [date,skillId] of [["2026-11-10",positionId],["2026-11-11",positionId],["2026-11-10",cashierId]] as const){
      const interval=shiftInterval(date,"08:00","14:00","Asia/Ho_Chi_Minh");
      await client.query(`INSERT INTO shift_slots
        (schedule_id,work_date,shift_template_id,position_id,start_at,end_at,min_count,ideal_count)
        VALUES ($1,$2,$3,$4,$5,$6,1,1)
        ON CONFLICT (schedule_id,work_date,shift_template_id,position_id) DO NOTHING`,
        [feasibleSchedule,date,morning,skillId,interval.start,interval.end]);
    }
    await client.query(`INSERT INTO availability_rules (user_id,weekday,start_time,end_time,kind,valid_from,valid_to,reason)
      SELECT $1,7,'09:00','13:00','busy','2026-11-02','2026-11-08','Demo shortage'
      WHERE NOT EXISTS (SELECT 1 FROM availability_rules WHERE user_id=$1 AND weekday=7 AND reason='Demo shortage')`,[mai]);
    for(const userId of [linh,minh,mai,an,binh])for(const date of ["2026-11-09","2026-11-10","2026-11-11"])
      await client.query(`INSERT INTO shift_preferences (user_id,store_id,work_date,shift_template_id,preference)
        VALUES ($1,$2,$3,$4,2) ON CONFLICT (user_id,work_date,shift_template_id) DO NOTHING`,[userId,storeA,date,morning]);
    for(const [targetSlot,userId,pinned,actor] of [[nightSlot,linh,true,managerA],[otherSlot,linh,false,managerB]] as const){
      await client.query(`INSERT INTO shift_assignments (slot_id,user_id,start_at,end_at,source,is_pinned,created_by)
        VALUES ($1,$2,$3,$4,'manual',$5,$6) ON CONFLICT (slot_id,user_id) DO NOTHING`,
        [targetSlot.id,userId,targetSlot.start_at,targetSlot.end_at,pinned,actor]);
    }
    await client.query(`INSERT INTO leave_types (name,is_paid,requires_attachment)
      VALUES ('Nghỉ phép năm',true,false) ON CONFLICT (name) DO NOTHING`);
    const typeId=(await client.query<{id:string}>("SELECT id FROM leave_types WHERE name='Nghỉ phép năm'")).rows[0].id;
    const existing=await client.query(`SELECT 1 FROM leave_requests WHERE user_id=$1 AND store_id=$2
      AND start_date='2026-11-08' AND end_date='2026-11-08'`,[minh,storeA]);
    if(!existing.rowCount)await client.query(`INSERT INTO leave_requests
      (user_id,store_id,leave_type_id,start_date,end_date,reason,status,reviewed_by,reviewed_at)
      VALUES ($1,$2,$3,'2026-11-08','2026-11-08','Demo approved leave','approved',$4,now())`,
      [minh,storeA,typeId,managerA]);
    await client.query("COMMIT");
    console.info(JSON.stringify({storeA,storeB,scheduleA,scheduleB,feasibleSchedule,linh,minh,mai,an,binh,ha}));
  }catch(error){await client.query("ROLLBACK");throw error;}finally{client.release();await getPool().end();}
}
main().catch((error:unknown)=>{console.error(error);process.exitCode=1;});
