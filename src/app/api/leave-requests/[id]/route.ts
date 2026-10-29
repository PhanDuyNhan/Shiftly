import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePrincipal } from "@/server/leave/access";
import { errorResponse } from "@/server/leave/errors";
import { getLeave } from "@/server/leave/read";
type Context={params:Promise<{id:string}>};
export async function GET(request:Request,context:Context){
  try{return NextResponse.json(await getLeave(await requirePrincipal(request),z.uuid().parse((await context.params).id)));}
  catch(error){return errorResponse(error);}
}
