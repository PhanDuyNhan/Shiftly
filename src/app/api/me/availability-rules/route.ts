import { NextResponse } from "next/server";
import { requirePrincipal } from "@/server/scheduling/access";
import { verifyCsrf } from "@/server/scheduling/csrf";
import { errorResponse } from "@/server/scheduling/errors";
import { readRules,replaceRules } from "@/server/scheduling/availability";
export async function GET(request:Request){try{return NextResponse.json(await readRules((await requirePrincipal(request)).id));}catch(error){return errorResponse(error);}}
export async function PUT(request:Request){try{const principal=await requirePrincipal(request);verifyCsrf(request,principal);return NextResponse.json(await replaceRules(principal.id,await request.json()));}catch(error){return errorResponse(error);}}
