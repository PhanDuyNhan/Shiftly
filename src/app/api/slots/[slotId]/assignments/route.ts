import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePrincipal } from "@/server/scheduling/access";
import { verifyCsrf } from "@/server/scheduling/csrf";
import { errorResponse,HttpError } from "@/server/scheduling/errors";
import { addAssignment } from "@/server/scheduling/edit-assignment";
type Context={params:Promise<{slotId:string}>};
const schema=z.object({user_id:z.uuid(),expected_version:z.number().int().positive(),reason:z.string().optional()}).strict();
export async function POST(request:Request,context:Context){try{const p=await requirePrincipal(request);verifyCsrf(request,p);const input=schema.safeParse(await request.json());if(!input.success)throw new HttpError(422,"invalid","Invalid assignment");return NextResponse.json(await addAssignment(p,z.uuid().parse((await context.params).slotId),input.data.user_id,input.data.expected_version,input.data.reason??null),{status:201});}catch(error){return errorResponse(error);}}
