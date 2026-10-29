import { z } from "zod";
import { requirePrincipal } from "@/server/leave/access";
import { authorizedAttachment } from "@/server/leave/attachments";
import { errorResponse } from "@/server/leave/errors";
import { findScopedRequest } from "@/server/leave/repository";
type Context={params:Promise<{id:string}>};
export const runtime="nodejs";
export async function GET(request:Request,context:Context){
  try{
    const principal=await requirePrincipal(request);
    const row=await findScopedRequest(principal,z.uuid().parse((await context.params).id));
    const attachment=await authorizedAttachment(principal,row);
    return new Response(new Uint8Array(attachment.bytes),{headers:{"content-type":attachment.mime,"cache-control":"private, no-store","content-disposition":"attachment; filename=leave-attachment"}});
  }catch(error){return errorResponse(error);}
}
