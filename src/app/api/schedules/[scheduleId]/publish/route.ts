import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePrincipal } from "@/server/scheduling/access";
import { verifyCsrf } from "@/server/scheduling/csrf";
import { errorResponse } from "@/server/scheduling/errors";
import { publishSchedule } from "@/server/scheduling/publish";
type Context={params:Promise<{scheduleId:string}>};
export async function POST(request:Request,context:Context){try{const p=await requirePrincipal(request);verifyCsrf(request,p);return NextResponse.json(await publishSchedule(p,z.uuid().parse((await context.params).scheduleId)));}catch(error){return errorResponse(error);}}
