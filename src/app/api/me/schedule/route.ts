import { NextResponse } from "next/server";
import { requirePrincipal } from "@/server/scheduling/access";
import { errorResponse } from "@/server/scheduling/errors";
import { readPublished } from "@/server/scheduling/read-published";
export async function GET(request:Request){try{const p=await requirePrincipal(request);return NextResponse.json(await readPublished(p.id,new URL(request.url).searchParams.get("week")??""));}catch(error){return errorResponse(error);}}
