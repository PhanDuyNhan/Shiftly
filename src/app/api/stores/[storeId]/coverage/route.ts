import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePrincipal,requireStoreRole } from "@/server/scheduling/access";
import { errorResponse } from "@/server/scheduling/errors";
import { coverage } from "@/server/scheduling/coverage";
type Context={params:Promise<{storeId:string}>};
export async function GET(request:Request,context:Context){try{const p=await requirePrincipal(request);const id=z.uuid().parse((await context.params).storeId);await requireStoreRole(p,id,"manager");return NextResponse.json(await coverage(id,new URL(request.url).searchParams.get("week")??""));}catch(error){return errorResponse(error);}}
