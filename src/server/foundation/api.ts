import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import type { PoolClient } from "pg";
import { getPool } from "@/db/client";
import { requireAdmin, requireStoreRole } from "@/server/auth/access";
import { verifyCsrf } from "@/server/auth/csrf";
import { errorResponse, HttpError } from "@/server/auth/errors";
import { hashPassword } from "@/server/auth/password";
import { requirePrincipal, type Principal } from "@/server/auth/session";

const uuid = z.uuid();
const name = z.string().trim().min(1).max(160);
const timezone=z.string().trim().refine((value)=>{try{new Intl.DateTimeFormat("en-US",{timeZone:value});return true;}catch{return false;}},{message:"Invalid timezone"});
const clockTime=z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const storeInput = z.object({ code: name.max(32), name, address: z.string().trim().optional(), phone: z.string().trim().optional(), timezone: timezone.default(process.env.DEFAULT_STORE_TIMEZONE??"Asia/Ho_Chi_Minh") }).strict();
const positionInput = z.object({ name, color: z.string().trim().optional() }).strict();
const employeeInput = z.object({
  email: z.email().optional(), phone: z.string().trim().min(5).optional(), full_name: name,
  employment_type: z.enum(["full_time", "part_time"]).default("part_time"),
  target_hours_week: z.number().nonnegative().optional(), max_hours_week: z.number().positive().default(48),
  managed_by: uuid.optional(),
  positions: z.array(z.object({ position_id: uuid, skill_level: z.number().int().min(1).max(5) })).default([]),
}).strict().refine((value) => !!value.email || !!value.phone, { message: "Email or phone is required" });
const templateInput = z.object({ name, start_time: clockTime, end_time: clockTime, is_peak: z.boolean().default(false), is_unsocial: z.boolean().default(false) }).strict();
const requirementInput = z.object({ weekday: z.number().int().min(1).max(7), shift_template_id: uuid, position_id: uuid, min_count: z.number().int().nonnegative(), ideal_count: z.number().int().nonnegative() }).strict()
  .refine((value) => value.ideal_count >= value.min_count, { message: "ideal_count must be at least min_count" });

function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new HttpError(422, "invalid", "Invalid input", { issues: result.error.issues });
  return result.data;
}

async function body(request: Request): Promise<unknown> {
  try { return await request.json(); }
  catch { throw new HttpError(422, "invalid", "Expected JSON body"); }
}

async function transaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) { await client.query("ROLLBACK"); throw error; }
  finally { client.release(); }
}

async function audit(client: PoolClient, actor: Principal, action: string, entityType: string, entityId: string, storeId: string | null, before: unknown, after: unknown) {
  await client.query(`INSERT INTO audit_logs (actor_id, store_id, action, entity_type, entity_id, before_data, after_data)
    VALUES ($1,$2,$3,$4,$5,$6,$7)`, [actor.id, storeId, action, entityType, entityId,
      before === null ? null : JSON.stringify(before), after === null ? null : JSON.stringify(after)]);
}

function rowOr404<T>(rows: T[]): T { if (!rows.length) throw new HttpError(404, "not_found", "Record not found"); return rows[0]; }

async function requireReport(principal:Principal,storeId:string,userId:string):Promise<void>{
  if(principal.systemRole==="admin")return;
  const result=await getPool().query(`SELECT 1 FROM store_memberships
    WHERE user_id=$1 AND store_id=$2 AND role_in_store='employee'
      AND managed_by=$3`,[userId,storeId,principal.id]);
  if(!result.rowCount)throw new HttpError(403,"forbidden","Employee is managed by another manager");
}

async function updateRow(table: string, id: string, fields: Record<string, unknown>, allowed: string[], client: PoolClient) {
  const entries = Object.entries(fields).filter(([key]) => allowed.includes(key));
  if (!entries.length || entries.length !== Object.keys(fields).length) throw new HttpError(422, "invalid", "Invalid fields");
  const sets = entries.map(([key], index) => `${key} = $${index + 2}`).join(", ");
  const result = await client.query(`UPDATE ${table} SET ${sets} WHERE id = $1 RETURNING *`, [id, ...entries.map((entry) => entry[1])]);
  return rowOr404(result.rows);
}

export async function foundationApi(request: Request, segments: string[], method: string) {
  try {
    const principal = await requirePrincipal(request);
    if (method !== "GET") verifyCsrf(request, principal);
    const [resource, first, second, third] = segments;
    const pool = getPool();

    if (resource === "users" && !first && method === "GET") {
      await requireAdmin(principal);
      return NextResponse.json((await pool.query(`SELECT u.id,u.email,u.phone,u.status,p.full_name
        FROM users u LEFT JOIN employee_profiles p ON p.user_id=u.id ORDER BY u.created_at DESC LIMIT 500`)).rows);
    }

    if(resource==="available-employees"&&!first&&method==="GET"){
      if(principal.systemRole!=="admin"){
        const manager=await pool.query(`SELECT 1 FROM store_memberships WHERE user_id=$1
          AND role_in_store='manager' AND left_at IS NULL LIMIT 1`,[principal.id]);
        if(!manager.rowCount)throw new HttpError(403,"forbidden","Manager role required");
      }
      return NextResponse.json((await pool.query(`SELECT u.id,p.full_name,m.store_id AS home_store_id,s.name AS home_store_name,u.status
        FROM store_memberships m JOIN users u ON u.id=m.user_id
        JOIN employee_profiles p ON p.user_id=u.id JOIN stores s ON s.id=m.store_id
        WHERE m.role_in_store='employee' AND m.left_at IS NULL AND u.status='active' AND s.is_active=true
        ORDER BY s.name,p.full_name`)).rows);
    }

    if (resource === "stores" && !first) {
      if (method === "GET") {
        const result = principal.systemRole === "admin"
          ? await pool.query("SELECT * FROM stores ORDER BY name")
          : await pool.query(`SELECT s.* FROM stores s JOIN store_memberships m ON m.store_id = s.id
              WHERE m.user_id = $1 AND m.left_at IS NULL ORDER BY s.name`, [principal.id]);
        return NextResponse.json(result.rows);
      }
      if (method === "POST") {
        await requireAdmin(principal);
        const input = parse(storeInput, await body(request));
        const row = await transaction(async (client) => {
          const result = await client.query(`INSERT INTO stores (code,name,address,phone,timezone)
            VALUES ($1,$2,$3,$4,$5) RETURNING *`, [input.code, input.name, input.address ?? null, input.phone ?? null, input.timezone]);
          const created = result.rows[0];
          await client.query("INSERT INTO store_settings (store_id) VALUES ($1)", [created.id]);
          await audit(client, principal, "store.create", "store", created.id, created.id, null, created);
          return created;
        });
        return NextResponse.json(row, { status: 201 });
      }
    }

    if (resource === "stores" && first && !second) {
      const storeId = parse(uuid, first);
      if (method === "PATCH") {
        await requireAdmin(principal);
        const fields = parse(z.object({ code: name.max(32).optional(), name: name.optional(), address: z.string().trim().nullable().optional(), phone: z.string().trim().nullable().optional(), timezone: timezone.optional(), is_active: z.boolean().optional() }).strict(), await body(request));
        const row = await transaction(async (client) => {
          const before = rowOr404((await client.query("SELECT * FROM stores WHERE id = $1 FOR UPDATE", [storeId])).rows);
          const updated = await updateRow("stores", storeId, fields, ["code","name","address","phone","timezone","is_active"], client);
          await audit(client, principal, "store.update", "store", storeId, storeId, before, updated);
          return updated;
        });
        return NextResponse.json(row);
      }
    }

    if(resource==="stores"&&first&&second==="managers"&&!third&&method==="GET"){
      const storeId=parse(uuid,first);
      await requireStoreRole(principal,storeId,"manager");
      return NextResponse.json((await pool.query(`SELECT u.id,p.full_name,u.email FROM store_memberships m
        JOIN users u ON u.id=m.user_id JOIN employee_profiles p ON p.user_id=u.id
        WHERE m.store_id=$1 AND m.role_in_store='manager' AND m.left_at IS NULL AND u.status='active'
        ORDER BY p.full_name`,[storeId])).rows);
    }

    if (resource === "stores" && first && second === "managers" && third) {
      await requireAdmin(principal);
      const storeId = parse(uuid, first), userId = parse(uuid, third);
      if (method === "PUT" || method === "DELETE") {
        const row = await transaction(async (client) => {
          const store=await client.query("SELECT 1 FROM stores WHERE id=$1 AND is_active=true",[storeId]);
          if(!store.rowCount)throw new HttpError(422,"invalid","Store is inactive");
          const user = await client.query("SELECT 1 FROM users WHERE id=$1 AND status='active'",[userId]);
          if (!user.rowCount) throw new HttpError(422,"invalid","User is not active");
          const before = (await client.query("SELECT * FROM store_memberships WHERE user_id = $1 AND store_id = $2 FOR UPDATE", [userId, storeId])).rows[0] ?? null;
          if (method === "DELETE" && !before) throw new HttpError(404,"not_found","Membership not found");
          if(method==="DELETE"&&before.role_in_store!=="manager")throw new HttpError(409,"conflict","User is not a manager in this store");
          if(method==="DELETE")await client.query(`UPDATE store_memberships SET managed_by=$3
            WHERE store_id=$1 AND managed_by=$2 AND role_in_store='employee' AND left_at IS NULL`,[storeId,userId,principal.id]);
          const otherHome=method==="DELETE"?(await client.query(`SELECT 1 FROM store_memberships
            WHERE user_id=$1 AND store_id<>$2 AND role_in_store='employee' AND left_at IS NULL`,[userId,storeId])).rowCount:0;
          const result = method === "PUT"
            ? await client.query(`INSERT INTO store_memberships (user_id,store_id,role_in_store)
                VALUES ($1,$2,'manager') ON CONFLICT (user_id,store_id) DO UPDATE SET role_in_store='manager',left_at=NULL RETURNING *`,[userId,storeId])
            : otherHome?await client.query(`UPDATE store_memberships SET left_at=current_date,is_primary=false
                WHERE user_id=$1 AND store_id=$2 AND left_at IS NULL RETURNING *`,[userId,storeId])
              :await client.query(`UPDATE store_memberships SET role_in_store='employee',managed_by=$3,is_primary=true
                WHERE user_id=$1 AND store_id=$2 AND left_at IS NULL RETURNING *`,[userId,storeId,principal.id]);
          const updated = rowOr404(result.rows);
          await audit(client, principal, method === "PUT" ? "manager.assign" : "manager.revoke", "store_membership", updated.id, storeId, before, updated);
          return updated;
        });
        return NextResponse.json(row);
      }
    }

    if (resource === "positions" && !first) {
      if (method === "GET") return NextResponse.json((await pool.query("SELECT * FROM positions ORDER BY name")).rows);
      if (method === "POST") {
        await requireAdmin(principal);
        const input = parse(positionInput, await body(request));
        const row = await transaction(async (client) => {
          const created = (await client.query("INSERT INTO positions (name,color) VALUES ($1,$2) RETURNING *", [input.name, input.color ?? null])).rows[0];
          await audit(client, principal, "position.create", "position", created.id, null, null, created);
          return created;
        });
        return NextResponse.json(row, { status: 201 });
      }
    }
    if (resource === "positions" && first && !second && method === "PATCH") {
      await requireAdmin(principal);
      const id = parse(uuid, first);
      const fields = parse(z.object({ name: name.optional(), color: z.string().trim().nullable().optional(), is_active: z.boolean().optional() }).strict(), await body(request));
      const row = await transaction(async (client) => {
        const before = rowOr404((await client.query("SELECT * FROM positions WHERE id = $1 FOR UPDATE", [id])).rows);
        const updated = await updateRow("positions", id, fields, ["name","color","is_active"], client);
        await audit(client, principal, "position.update", "position", id, null, before, updated);
        return updated;
      });
      return NextResponse.json(row);
    }

    if (resource === "stores" && first && second === "employees" && !third) {
      const storeId = parse(uuid, first);
      await requireStoreRole(principal, storeId, "manager");
      if (method === "GET") {
        const result = await pool.query(`SELECT u.id,u.email,u.phone,u.status,u.must_change_password,p.full_name,p.display_name,
          m.role_in_store,m.employment_type,m.target_hours_week,m.max_hours_week,m.left_at,m.managed_by,mp.full_name AS manager_name
          FROM store_memberships m JOIN users u ON u.id=m.user_id JOIN employee_profiles p ON p.user_id=u.id
          LEFT JOIN employee_profiles mp ON mp.user_id=m.managed_by
          WHERE m.store_id=$1 AND ($2::boolean OR m.managed_by=$3) ORDER BY p.full_name`, [storeId,principal.systemRole==="admin",principal.id]);
        return NextResponse.json(result.rows);
      }
      if (method === "POST") {
        const input = parse(employeeInput, await body(request));
        const temporaryPassword = randomBytes(18).toString("base64url");
        const row = await transaction(async (client) => {
          const store = await client.query("SELECT 1 FROM stores WHERE id=$1 AND is_active=true", [storeId]);
          if (!store.rowCount) throw new HttpError(422, "invalid", "Store is inactive");
          if(principal.systemRole!=="admin"&&input.managed_by&&input.managed_by!==principal.id)throw new HttpError(403,"forbidden","Cannot assign another manager");
          const supervisorId=principal.systemRole!=="admin"?principal.id:input.managed_by??(await client.query<{user_id:string}>(`SELECT m.user_id FROM store_memberships m JOIN users u ON u.id=m.user_id
            WHERE m.store_id=$1 AND m.role_in_store='manager' AND m.left_at IS NULL AND u.status='active'
            ORDER BY m.id LIMIT 1`,[storeId])).rows[0]?.user_id??principal.id;
          if(supervisorId!==principal.id){
            const valid=await client.query(`SELECT 1 FROM store_memberships m JOIN users u ON u.id=m.user_id
              WHERE m.user_id=$1 AND m.store_id=$2 AND m.role_in_store='manager' AND m.left_at IS NULL AND u.status='active'`,[supervisorId,storeId]);
            if(!valid.rowCount)throw new HttpError(422,"invalid","Manager is not active in this store");
          }
          const created = (await client.query(`INSERT INTO users (email,phone,password_hash,created_by)
            VALUES ($1,$2,$3,$4) RETURNING id,email,phone,status`,
            [input.email?.toLowerCase() ?? null, input.phone ?? null, await hashPassword(temporaryPassword), principal.id])).rows[0];
          await client.query("INSERT INTO employee_profiles (user_id,full_name) VALUES ($1,$2)", [created.id,input.full_name]);
          await client.query(`INSERT INTO store_memberships (user_id,store_id,role_in_store,employment_type,target_hours_week,max_hours_week,is_primary,managed_by)
            VALUES ($1,$2,'employee',$3,$4,$5,true,$6)`, [created.id,storeId,input.employment_type,input.target_hours_week ?? null,input.max_hours_week,supervisorId]);
          for (const position of input.positions) {
            const active = await client.query("SELECT 1 FROM positions WHERE id=$1 AND is_active=true", [position.position_id]);
            if (!active.rowCount) throw new HttpError(422,"invalid","Position is inactive");
            await client.query("INSERT INTO user_positions (user_id,position_id,skill_level) VALUES ($1,$2,$3)",
              [created.id,position.position_id,position.skill_level]);
          }
          await audit(client, principal, "user.create", "user", created.id, storeId, null, created);
          return created;
        });
        return NextResponse.json({ ...row, temporary_password: temporaryPassword }, { status: 201 });
      }
    }

    if (resource === "stores" && first && second === "shift-templates") {
      const storeId = parse(uuid, first);
      await requireStoreRole(principal, storeId, method === "GET" ? "employee" : "manager");
      if (!third && method === "GET") return NextResponse.json((await pool.query("SELECT * FROM shift_templates WHERE store_id=$1 ORDER BY name", [storeId])).rows);
      if (!third && method === "POST") {
        const input = parse(templateInput, await body(request));
        const row = await transaction(async (client) => {
          const created = (await client.query(`INSERT INTO shift_templates (store_id,name,start_time,end_time,is_peak,is_unsocial)
            VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`, [storeId,input.name,input.start_time,input.end_time,input.is_peak,input.is_unsocial])).rows[0];
          await audit(client,principal,"shift_template.create","shift_template",created.id,storeId,null,created);
          return created;
        });
        return NextResponse.json(row,{status:201});
      }
      if (third && method === "PATCH") {
        const id = parse(uuid, third);
        const fields = parse(templateInput.partial().extend({ is_active: z.boolean().optional() }),await body(request));
        const row = await transaction(async (client) => {
          const before = rowOr404((await client.query("SELECT * FROM shift_templates WHERE id=$1 AND store_id=$2 FOR UPDATE",[id,storeId])).rows);
          const updated = await updateRow("shift_templates",id,fields,["name","start_time","end_time","is_peak","is_unsocial","is_active"],client);
          await audit(client,principal,"shift_template.update","shift_template",id,storeId,before,updated);
          return updated;
        });
        return NextResponse.json(row);
      }
    }

    if (resource === "stores" && first && second === "settings" && !third) {
      const storeId = parse(uuid,first);
      await requireStoreRole(principal,storeId,"manager");
      if (method === "GET") return NextResponse.json(rowOr404((await pool.query("SELECT * FROM store_settings WHERE store_id=$1",[storeId])).rows));
      if (method === "PATCH") {
        const fields = parse(z.object({ max_hours_day:z.number().positive().optional(), min_rest_hours:z.number().nonnegative().optional(), require_weekly_day_off:z.boolean().optional(), registration_deadline_weekday:z.number().int().min(1).max(7).optional(), registration_deadline_time:clockTime.optional() }).strict(),await body(request));
        const row = await transaction(async (client) => {
          const before = rowOr404((await client.query("SELECT * FROM store_settings WHERE store_id=$1 FOR UPDATE",[storeId])).rows);
          const entries = Object.entries(fields);
          if (!entries.length) throw new HttpError(422,"invalid","No fields to update");
          const updated = (await client.query(`UPDATE store_settings SET ${entries.map(([key],i)=>`${key}=$${i+2}`).join(",")},updated_at=now()
            WHERE store_id=$1 RETURNING *`,[storeId,...entries.map((e)=>e[1])])).rows[0];
          await audit(client,principal,"store_settings.update","store",storeId,storeId,before,updated);
          return updated;
        });
        return NextResponse.json(row);
      }
    }

    if (resource === "stores" && first && second === "staffing-requirements") {
      const storeId = parse(uuid, first);
      await requireStoreRole(principal, storeId, "manager");
      if (!third && method === "GET") return NextResponse.json((await pool.query("SELECT * FROM staffing_requirements WHERE store_id=$1 ORDER BY weekday",[storeId])).rows);
      if (!third && method === "POST") {
        const input = parse(requirementInput,await body(request));
        const row = await transaction(async (client) => {
          const valid = await client.query(`SELECT 1 FROM shift_templates t JOIN positions p ON p.id=$3
            JOIN stores s ON s.id=t.store_id WHERE t.id=$2 AND t.store_id=$1 AND t.is_active AND p.is_active AND s.is_active`,
            [storeId,input.shift_template_id,input.position_id]);
          if (!valid.rowCount) throw new HttpError(422,"invalid","Inactive or mismatched template/position");
          const created = (await client.query(`INSERT INTO staffing_requirements (store_id,weekday,shift_template_id,position_id,min_count,ideal_count)
            VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,[storeId,input.weekday,input.shift_template_id,input.position_id,input.min_count,input.ideal_count])).rows[0];
          await audit(client,principal,"staffing_requirement.create","staffing_requirement",created.id,storeId,null,created);
          return created;
        });
        return NextResponse.json(row,{status:201});
      }
      if (third && (method === "PATCH" || method === "DELETE")) {
        const id = parse(uuid,third);
        const row = await transaction(async (client) => {
          const before = rowOr404((await client.query("SELECT * FROM staffing_requirements WHERE id=$1 AND store_id=$2 FOR UPDATE",[id,storeId])).rows);
          if (method === "DELETE") {
            await client.query("DELETE FROM staffing_requirements WHERE id=$1",[id]);
            await audit(client,principal,"staffing_requirement.delete","staffing_requirement",id,storeId,before,null);
            return null;
          }
          const fields = parse(requirementInput.partial(),await body(request));
          const merged = { ...before, ...fields };
          if (merged.ideal_count < merged.min_count) throw new HttpError(422,"invalid","ideal_count must be at least min_count");
          const updated = await updateRow("staffing_requirements",id,fields,["weekday","shift_template_id","position_id","min_count","ideal_count"],client);
          await audit(client,principal,"staffing_requirement.update","staffing_requirement",id,storeId,before,updated);
          return updated;
        });
        return NextResponse.json(row ?? { ok: true });
      }
    }

    if (resource === "me" && first === "profile" && !second) {
      if (method === "GET") return NextResponse.json(rowOr404((await pool.query(`SELECT p.*,u.phone FROM employee_profiles p
        JOIN users u ON u.id=p.user_id WHERE p.user_id=$1`,[principal.id])).rows));
      if (method === "PATCH") {
        const fields = parse(z.object({ display_name:z.string().trim().nullable().optional(), phone:z.string().trim().nullable().optional(), address:z.string().trim().nullable().optional(), avatar_url:z.url().nullable().optional(), emergency_contact_name:z.string().trim().nullable().optional(), emergency_contact_phone:z.string().trim().nullable().optional(), bank_name:z.string().trim().nullable().optional(), bank_account:z.string().trim().nullable().optional() }).strict(),await body(request));
        const row = await transaction(async (client) => {
          const before = rowOr404((await client.query(`SELECT p.*,u.phone,u.email FROM employee_profiles p
            JOIN users u ON u.id=p.user_id WHERE p.user_id=$1 FOR UPDATE OF p,u`,[principal.id])).rows);
          const {phone,...profile} = fields;
          if (phone === null && !before.email) throw new HttpError(422,"invalid","Phone is required when the account has no email");
          if (phone !== undefined) await client.query("UPDATE users SET phone=$2 WHERE id=$1",[principal.id,phone]);
          if (Object.keys(profile).length) {
            const entries = Object.entries(profile);
            await client.query(`UPDATE employee_profiles SET ${entries.map(([key],i)=>`${key}=$${i+2}`).join(",")},updated_at=now()
              WHERE user_id=$1`,[principal.id,...entries.map((e)=>e[1])]);
          }
          const updated = rowOr404((await client.query(`SELECT p.*,u.phone FROM employee_profiles p
            JOIN users u ON u.id=p.user_id WHERE p.user_id=$1`,[principal.id])).rows);
          await audit(client,principal,"profile.update","employee_profile",principal.id,null,before,updated);
          return updated;
        });
        return NextResponse.json(row);
      }
    }

    if (resource === "stores" && first && second === "employees" && third && segments[4]) {
      const storeId = parse(uuid,first), userId = parse(uuid,third), action = segments[4];
      await requireStoreRole(principal,storeId,"manager");
      if (principal.id === userId) throw new HttpError(403,"forbidden","Cannot change your own account");
      await requireReport(principal,storeId,userId);
      if(action==="manager"&&method==="PATCH"){
        await requireAdmin(principal);
        const {managed_by:managerId}=parse(z.object({managed_by:uuid}).strict(),await body(request));
        const updated=await transaction(async(client)=>{
          const target=await client.query(`SELECT 1 FROM store_memberships m JOIN users u ON u.id=m.user_id
            WHERE m.user_id=$1 AND m.store_id=$2 AND m.role_in_store='manager' AND m.left_at IS NULL AND u.status='active'`,[managerId,storeId]);
          if(!target.rowCount)throw new HttpError(422,"invalid","Manager is not active in this store");
          const before=rowOr404((await client.query(`SELECT * FROM store_memberships
            WHERE user_id=$1 AND store_id=$2 AND role_in_store='employee' AND left_at IS NULL FOR UPDATE`,[userId,storeId])).rows);
          const after=(await client.query(`UPDATE store_memberships SET managed_by=$3 WHERE user_id=$1 AND store_id=$2 RETURNING *`,[userId,storeId,managerId])).rows[0];
          await audit(client,principal,"employee.manager_change","store_membership",after.id,storeId,before,after);
          return after;
        });
        return NextResponse.json(updated);
      }
      if (action === "status" && method === "POST") {
        const { status } = parse(z.object({status:z.enum(["active","locked","left"])}).strict(),await body(request));
        const row = await transaction(async (client) => {
          const before = rowOr404((await client.query(`SELECT u.id,u.status,u.system_role,m.id AS membership_id,m.left_at,m.role_in_store
            FROM users u JOIN store_memberships m ON m.user_id=u.id
            WHERE u.id=$1 AND m.store_id=$2 FOR UPDATE OF u,m`,[userId,storeId])).rows);
          if (before.system_role === "admin") throw new HttpError(403,"forbidden","Cannot change an admin account");
          if (principal.systemRole !== "admin" && before.role_in_store === "manager") throw new HttpError(403,"forbidden","Cannot change a manager account");
          if (before.status === "left") throw new HttpError(409,"conflict","Use the restore action for a former employee");
          if(before.role_in_store==="manager"&&status!=="active"){
            const replacement=(await client.query<{user_id:string}>(`SELECT m.user_id FROM store_memberships m JOIN users u ON u.id=m.user_id
              WHERE m.store_id=$1 AND m.user_id<>$2 AND m.role_in_store='manager'
                AND m.left_at IS NULL AND u.status='active' ORDER BY m.id LIMIT 1`,[storeId,userId])).rows[0]?.user_id??principal.id;
            await client.query(`UPDATE store_memberships SET managed_by=$3
              WHERE store_id=$1 AND managed_by=$2 AND role_in_store='employee'`,[storeId,userId,replacement]);
          }
          if (status === "left") {
            await client.query("UPDATE store_memberships SET left_at=current_date WHERE id=$1",[before.membership_id]);
          }
          const updated = (await client.query("UPDATE users SET status=$2 WHERE id=$1 RETURNING id,status",[userId,status])).rows[0];
          await audit(client,principal,status === "left" ? "user.leave" : "user.status", "user",userId,storeId,before,updated);
          return updated;
        });
        return NextResponse.json(row);
      }
      if (action === "restore" && method === "POST") {
        const row = await transaction(async (client) => {
          const before = rowOr404((await client.query(`SELECT u.id,u.status,m.id AS membership_id,m.left_at
            FROM users u JOIN store_memberships m ON m.user_id=u.id
            WHERE u.id=$1 AND m.store_id=$2 FOR UPDATE OF u,m`,[userId,storeId])).rows);
          if (before.status !== "left") throw new HttpError(409,"conflict","Account is not former employee");
          const record = (await client.query(`SELECT actor_id,store_id FROM audit_logs
            WHERE entity_type='user' AND entity_id=$1 AND action='user.leave' ORDER BY created_at DESC,id DESC LIMIT 1`,[userId])).rows[0];
          if (!record || record.store_id !== storeId || (principal.systemRole !== "admin" && record.actor_id !== principal.id)) {
            throw new HttpError(403,"forbidden","Only the manager who recorded departure may restore this account");
          }
          await client.query("UPDATE store_memberships SET left_at=NULL WHERE id=$1",[before.membership_id]);
          const updated = (await client.query("UPDATE users SET status='active' WHERE id=$1 RETURNING id,status",[userId])).rows[0];
          await audit(client,principal,"user.restore","user",userId,storeId,before,updated);
          return updated;
        });
        return NextResponse.json(row);
      }
      if (action === "reset-password" && method === "POST") {
        const temporaryPassword = randomBytes(18).toString("base64url");
        await transaction(async (client) => {
          const target = rowOr404((await client.query(`SELECT u.id,u.system_role,m.role_in_store FROM users u
            JOIN store_memberships m ON m.user_id=u.id WHERE u.id=$1 AND m.store_id=$2 FOR UPDATE OF u`,[userId,storeId])).rows);
          if (target.system_role === "admin") throw new HttpError(403,"forbidden","Cannot reset an admin password");
          if (principal.systemRole !== "admin" && target.role_in_store === "manager") throw new HttpError(403,"forbidden","Cannot reset a manager password");
          await client.query("UPDATE users SET password_hash=$2,must_change_password=true WHERE id=$1",[userId,await hashPassword(temporaryPassword)]);
          await client.query("DELETE FROM sessions WHERE user_id=$1",[userId]);
          await audit(client,principal,"user.password_reset","user",userId,storeId,null,{must_change_password:true});
        });
        return NextResponse.json({ temporary_password:temporaryPassword });
      }
      if (action === "positions" && method === "PUT") {
        const positions = parse(z.array(z.object({position_id:uuid,skill_level:z.number().int().min(1).max(5)})),await body(request));
        const row = await transaction(async (client) => {
          const memberships = await client.query(`SELECT store_id FROM store_memberships WHERE user_id=$1 AND left_at IS NULL FOR UPDATE`,[userId]);
          if (!memberships.rows.some((item)=>item.store_id===storeId)) throw new HttpError(404,"not_found","Employee not in store");
          const targetRole=await client.query("SELECT role_in_store FROM store_memberships WHERE user_id=$1 AND store_id=$2",[userId,storeId]);
          if(principal.systemRole!=="admin"&&targetRole.rows[0]?.role_in_store==="manager")throw new HttpError(403,"forbidden","Cannot edit a manager account");
          if (principal.systemRole !== "admin" && memberships.rows.length > 1) throw new HttpError(403,"forbidden","Admin must edit shared skills");
          for (const position of positions) {
            const active = await client.query("SELECT 1 FROM positions WHERE id=$1 AND is_active=true",[position.position_id]);
            if (!active.rowCount) throw new HttpError(422,"invalid","Position is inactive");
          }
          const before = (await client.query("SELECT * FROM user_positions WHERE user_id=$1",[userId])).rows;
          await client.query("DELETE FROM user_positions WHERE user_id=$1",[userId]);
          for (const position of positions) await client.query("INSERT INTO user_positions VALUES ($1,$2,$3)",[userId,position.position_id,position.skill_level]);
          await audit(client,principal,"user.skills","user",userId,storeId,before,positions);
          return positions;
        });
        return NextResponse.json(row);
      }
      if (action === "positions" && method === "GET") {
        const member=await pool.query("SELECT 1 FROM store_memberships WHERE user_id=$1 AND store_id=$2",[userId,storeId]);
        if(!member.rowCount)throw new HttpError(404,"not_found","Employee not in store");
        return NextResponse.json((await pool.query("SELECT position_id,skill_level FROM user_positions WHERE user_id=$1 ORDER BY position_id",[userId])).rows);
      }
    }

    if (resource === "stores" && first && second === "employees" && third && !segments[4]) {
      const storeId = parse(uuid,first), userId = parse(uuid,third);
      await requireStoreRole(principal,storeId,"manager");
      await requireReport(principal,storeId,userId);
      if (method === "GET") {
        const result = await pool.query(`SELECT u.id,u.email,u.phone,u.status,u.must_change_password,p.*,m.role_in_store,
          m.employment_type,m.target_hours_week,m.max_hours_week,m.left_at,m.managed_by,mp.full_name AS manager_name FROM users u
          JOIN employee_profiles p ON p.user_id=u.id JOIN store_memberships m ON m.user_id=u.id
          LEFT JOIN employee_profiles mp ON mp.user_id=m.managed_by
          WHERE u.id=$1 AND m.store_id=$2`,[userId,storeId]);
        return NextResponse.json(rowOr404(result.rows));
      }
      if (method === "PATCH") {
        const fields = parse(z.object({ full_name:name.optional(), employment_type:z.enum(["full_time","part_time"]).optional(), target_hours_week:z.number().nonnegative().nullable().optional(), max_hours_week:z.number().positive().optional() }).strict(),await body(request));
        const row = await transaction(async (client) => {
          const before = rowOr404((await client.query("SELECT * FROM store_memberships WHERE user_id=$1 AND store_id=$2 FOR UPDATE",[userId,storeId])).rows);
          if (principal.systemRole !== "admin" && before.role_in_store === "manager") throw new HttpError(403,"forbidden","Cannot edit a manager account");
          if (fields.full_name) await client.query("UPDATE employee_profiles SET full_name=$2,updated_at=now() WHERE user_id=$1",[userId,fields.full_name]);
          const {full_name: _fullName,...membership} = fields;
          if (!Object.keys(membership).length) return before;
          const entries = Object.entries(membership);
          const updated = (await client.query(`UPDATE store_memberships SET ${entries.map(([key],i)=>`${key}=$${i+3}`).join(",")}
            WHERE user_id=$1 AND store_id=$2 RETURNING *`,[userId,storeId,...entries.map((e)=>e[1])])).rows[0];
          await audit(client,principal,"employee.update","store_membership",updated.id,storeId,before,updated);
          return updated;
        });
        return NextResponse.json(row);
      }
    }

    throw new HttpError(404,"not_found","Endpoint not found");
  } catch (error) { return errorResponse(error); }
}
