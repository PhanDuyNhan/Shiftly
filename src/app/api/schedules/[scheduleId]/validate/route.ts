import { NextResponse } from "next/server";
import { z } from "zod";
import { getPool } from "@/db/client";
import { requirePrincipal,requireStoreRole } from "@/server/scheduling/access";
import { verifyCsrf } from "@/server/scheduling/csrf";
import { errorResponse } from "@/server/scheduling/errors";
import { scheduleById } from "@/server/scheduling/schedules";
import { validateSchedule } from "@/server/scheduling/validate-schedule";
type Context={params:Promise<{scheduleId:string}>};
export async function POST(request:Request,context:Context){const client=await getPool().connect();try{const p=await requirePrincipal(request);verifyCsrf(request,p);const id=z.uuid().parse((await context.params).scheduleId);const schedule=await scheduleById(client,id);await requireStoreRole(p,schedule.store_id,"manager");return NextResponse.json(await validateSchedule(client,id));}catch(error){return errorResponse(error);}finally{client.release();}}
