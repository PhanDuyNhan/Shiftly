import { z } from "zod";
import { requirePrincipal } from "@/server/scheduling/access";
import { verifyCsrf } from "@/server/scheduling/csrf";
import { errorResponse } from "@/server/scheduling/errors";
import { deleteException } from "@/server/scheduling/availability";
type Context={params:Promise<{exceptionId:string}>};
export async function DELETE(request:Request,context:Context){try{const principal=await requirePrincipal(request);verifyCsrf(request,principal);await deleteException(principal.id,z.uuid().parse((await context.params).exceptionId));return new Response(null,{status:204});}catch(error){return errorResponse(error);}}
