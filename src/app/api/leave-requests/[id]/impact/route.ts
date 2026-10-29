import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePrincipal,requireReviewer } from "@/server/leave/access";
import { errorResponse } from "@/server/leave/errors";
import { findRequest } from "@/server/leave/repository";
import { leaveImpact } from "@/server/scheduling/leave-impact";
type Context={params:Promise<{id:string}>};
export async function GET(request:Request,context:Context){
  try{
    const principal=await requirePrincipal(request);
    const row=await findRequest(z.uuid().parse((await context.params).id));
    await requireReviewer(principal,row);
    return NextResponse.json({affected_assignments:await leaveImpact(row)});
  }catch(error){return errorResponse(error);}
}
