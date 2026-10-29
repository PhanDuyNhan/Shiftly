import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePrincipal } from "@/server/scheduling/access";
import { verifyCsrf } from "@/server/scheduling/csrf";
import { errorResponse,HttpError } from "@/server/scheduling/errors";
import { editAssignment } from "@/server/scheduling/edit-assignment";
type Context={params:Promise<{assignmentId:string}>};
const schema=z.object({action:z.enum(["reassign","unassign","pin","unpin"]),expected_version:z.number().int().positive(),user_id:z.uuid().optional(),reason:z.string().optional()}).strict();
export async function PATCH(request:Request,context:Context){try{const p=await requirePrincipal(request);verifyCsrf(request,p);const input=schema.safeParse(await request.json());if(!input.success)throw new HttpError(422,"invalid","Invalid assignment edit");return NextResponse.json(await editAssignment(p,z.uuid().parse((await context.params).assignmentId),input.data));}catch(error){return errorResponse(error);}}
