import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePrincipal } from "@/server/leave/access";
import { verifyCsrf } from "@/server/leave/csrf";
import { createLeave } from "@/server/leave/create";
import { errorResponse,HttpError } from "@/server/leave/errors";
import { listLeave } from "@/server/leave/read";
import { parseLeaveForm } from "@/server/leave/validation";
import { validDate } from "@/server/leave/date-range";

export const runtime="nodejs";
export async function GET(request:Request){
  try{
    const principal=await requirePrincipal(request);
    const params=new URL(request.url).searchParams;
    const storeId=params.get("store_id");
    if(storeId&&!z.uuid().safeParse(storeId).success) throw new HttpError(422,"invalid","Invalid store_id");
    const status=params.get("status")??undefined;
    if(status&&!z.enum(["pending","approved","rejected","cancelled"]).safeParse(status).success) throw new HttpError(422,"invalid","Invalid status");
    const from=params.get("from_date")??undefined,to=params.get("to_date")??undefined;
    if((from&&!validDate(from))||(to&&!validDate(to))||(from&&to&&to<from)) throw new HttpError(422,"invalid","Invalid date filter");
    return NextResponse.json(await listLeave(principal,storeId,{status,from,to}));
  }catch(error){return errorResponse(error);}
}
export async function POST(request:Request){
  try{
    const principal=await requirePrincipal(request);verifyCsrf(request,principal);
    const {input,file}=parseLeaveForm(await request.formData());
    return NextResponse.json(await createLeave(principal,input,file),{status:201});
  }catch(error){return errorResponse(error);}
}
