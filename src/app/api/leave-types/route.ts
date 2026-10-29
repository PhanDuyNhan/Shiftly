import { NextResponse } from "next/server";
import { z } from "zod";
import { getPool } from "@/db/client";
import { requireAdmin } from "@/server/auth/access";
import { verifyCsrf } from "@/server/auth/csrf";
import { errorResponse,HttpError } from "@/server/auth/errors";
import { requirePrincipal } from "@/server/auth/session";
import { createLeaveType } from "@/server/leave/type-admin";
import { activeLeaveTypes } from "@/server/leave/repository";

const schema=z.object({name:z.string().trim().min(1).max(160),is_paid:z.boolean(),requires_attachment:z.boolean()}).strict();

export async function GET(request:Request){
  try{
    const principal=await requirePrincipal(request);
    const includeInactive=new URL(request.url).searchParams.get("include_inactive")==="true";
    if(includeInactive) await requireAdmin(principal);
    return NextResponse.json(await activeLeaveTypes(includeInactive));
  }catch(error){return errorResponse(error);}
}
export async function POST(request:Request){
  try{
    const principal=await requirePrincipal(request);
    verifyCsrf(request,principal);await requireAdmin(principal);
    const parsed=schema.safeParse(await request.json());
    if(!parsed.success) throw new HttpError(422,"invalid","Invalid leave type",{issues:parsed.error.issues});
    const input=parsed.data;
    const row=await createLeaveType(input);
    return NextResponse.json(row,{status:201});
  }catch(error){return errorResponse(error);}
}
