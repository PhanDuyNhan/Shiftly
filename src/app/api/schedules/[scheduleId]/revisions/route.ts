import { NextResponse } from "next/server";
import { z } from "zod";
import { getPool } from "@/db/client";
import { requirePrincipal,requireStoreRole } from "@/server/scheduling/access";
import { errorResponse } from "@/server/scheduling/errors";
type Context={params:Promise<{scheduleId:string}>};
export async function GET(request:Request,context:Context){try{const p=await requirePrincipal(request);const id=z.uuid().parse((await context.params).scheduleId);const schedule=(await getPool().query<{store_id:string}>("SELECT store_id FROM schedules WHERE id=$1",[id])).rows[0];if(!schedule)return NextResponse.json({code:"not_found",message:"Schedule not found"},{status:404});await requireStoreRole(p,schedule.store_id,"manager");return NextResponse.json((await getPool().query("SELECT * FROM schedule_revisions WHERE schedule_id=$1 ORDER BY version DESC",[id])).rows);}catch(error){return errorResponse(error);}}
