import { NextResponse } from "next/server";
import { z } from "zod";
import { getPool } from "@/db/client";
import { requireAdmin } from "@/server/auth/access";
import { verifyCsrf } from "@/server/auth/csrf";
import { errorResponse,HttpError } from "@/server/auth/errors";
import { requirePrincipal } from "@/server/auth/session";
import { updateLeaveType } from "@/server/leave/type-admin";

type Context={params:Promise<{id:string}>};
const schema=z.object({name:z.string().trim().min(1).max(160).optional(),is_paid:z.boolean().optional(),requires_attachment:z.boolean().optional(),is_active:z.boolean().optional()}).strict();
export async function PATCH(request:Request,context:Context){
  try{
    const principal=await requirePrincipal(request);verifyCsrf(request,principal);await requireAdmin(principal);
    const id=z.uuid().parse((await context.params).id);
    const parsed=schema.safeParse(await request.json());
    if(!parsed.success||!Object.keys(parsed.data).length) throw new HttpError(422,"invalid","Invalid leave type");
    return NextResponse.json(await updateLeaveType(id,parsed.data));
  }catch(error){return errorResponse(error);}
}
