import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePrincipal } from "@/server/leave/access";
import { verifyCsrf } from "@/server/leave/csrf";
import { errorResponse,HttpError } from "@/server/leave/errors";
import { reviewLeave } from "@/server/leave/review";
type Context={params:Promise<{id:string}>};
const schema=z.object({decision:z.enum(["approved","rejected"]),review_note:z.string().nullable().optional()}).strict();
export async function POST(request:Request,context:Context){
  try{
    const principal=await requirePrincipal(request);verifyCsrf(request,principal);
    const parsed=schema.safeParse(await request.json());
    if(!parsed.success) throw new HttpError(422,"invalid","Invalid review decision");
    return NextResponse.json(await reviewLeave(principal,z.uuid().parse((await context.params).id),parsed.data.decision,parsed.data.review_note??null));
  }catch(error){return errorResponse(error);}
}
