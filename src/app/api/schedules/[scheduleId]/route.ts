import { NextResponse } from "next/server";
import { z } from "zod";
import { getPool } from "@/db/client";
import { requirePrincipal } from "@/server/scheduling/access";
import { errorResponse,HttpError } from "@/server/scheduling/errors";
import { readSchedule } from "@/server/scheduling/schedules";
type Context={params:Promise<{scheduleId:string}>};
export async function GET(request:Request,context:Context){try{const p=await requirePrincipal(request);const id=z.uuid().parse((await context.params).scheduleId);const row=(await getPool().query<{store_id:string;week_start:string}>("SELECT store_id,week_start FROM schedules WHERE id=$1",[id])).rows[0];if(!row)throw new HttpError(404,"not_found","Schedule not found");return NextResponse.json(await readSchedule(p,row.store_id,row.week_start));}catch(error){return errorResponse(error);}}
