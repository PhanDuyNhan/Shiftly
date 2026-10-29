import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePrincipal } from "@/server/scheduling/access";
import { verifyCsrf } from "@/server/scheduling/csrf";
import { errorResponse,HttpError } from "@/server/scheduling/errors";
import { readSchedule } from "@/server/scheduling/schedules";
import { createDraft } from "@/server/scheduling/create-draft";
type Context={params:Promise<{storeId:string}>};
export async function GET(request:Request,context:Context){try{const p=await requirePrincipal(request);const id=z.uuid().parse((await context.params).storeId);const week=new URL(request.url).searchParams.get("week")??"";return NextResponse.json(await readSchedule(p,id,week));}catch(error){return errorResponse(error);}}
export async function POST(request:Request,context:Context){try{const p=await requirePrincipal(request);verifyCsrf(request,p);const id=z.uuid().parse((await context.params).storeId);const data=z.object({week_start:z.string()}).strict().safeParse(await request.json());if(!data.success)throw new HttpError(422,"invalid","week_start required");return NextResponse.json(await createDraft(p,id,data.data.week_start),{status:201});}catch(error){return errorResponse(error);}}
