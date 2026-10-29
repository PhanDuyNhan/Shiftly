import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePrincipal } from "@/server/leave/access";
import { cancelLeave } from "@/server/leave/cancel";
import { verifyCsrf } from "@/server/leave/csrf";
import { errorResponse } from "@/server/leave/errors";
type Context={params:Promise<{id:string}>};
export async function POST(request:Request,context:Context){
  try{
    const principal=await requirePrincipal(request);verifyCsrf(request,principal);
    return NextResponse.json(await cancelLeave(principal,z.uuid().parse((await context.params).id)));
  }catch(error){return errorResponse(error);}
}
