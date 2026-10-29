import { NextResponse } from "next/server";
import { requirePrincipal } from "@/server/scheduling/access";
import { verifyCsrf } from "@/server/scheduling/csrf";
import { errorResponse,HttpError } from "@/server/scheduling/errors";
import { readPreferences,replacePreferences,preferenceDeadline,homeStore } from "@/server/scheduling/preferences";
import { getPool } from "@/db/client";
export async function GET(request:Request){try{const principal=await requirePrincipal(request);const week=new URL(request.url).searchParams.get("week")??"";const home=await homeStore(principal.id);const [preferences,templates,deadline]=await Promise.all([readPreferences(principal.id,week),getPool().query("SELECT id,name,start_time,end_time,is_active FROM shift_templates WHERE store_id=$1 AND is_active=true ORDER BY start_time",[home.store_id]),preferenceDeadline(home.store_id,week)]);return NextResponse.json({preferences,templates:templates.rows,deadline:deadline.toISOString(),store:{id:home.store_id,name:home.store_name}});}catch(error){return errorResponse(error);}}
export async function PUT(request:Request){try{const principal=await requirePrincipal(request);verifyCsrf(request,principal);const week=new URL(request.url).searchParams.get("week")??"";if(!week)throw new HttpError(422,"invalid","Week is required");return NextResponse.json(await replacePreferences(principal.id,week,await request.json()));}catch(error){return errorResponse(error);}}
