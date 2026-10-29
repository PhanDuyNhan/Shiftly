import { NextResponse } from "next/server";
import { requirePrincipal } from "@/server/scheduling/access";
import { verifyCsrf } from "@/server/scheduling/csrf";
import { errorResponse,HttpError } from "@/server/scheduling/errors";
import { readExceptions,addException } from "@/server/scheduling/availability";
import { validDate } from "@/server/leave/date-range";
export async function GET(request:Request){try{const userId=(await requirePrincipal(request)).id;const p=new URL(request.url).searchParams;const from=p.get("from")??"",to=p.get("to")??"";if(!validDate(from)||!validDate(to)||to<from)throw new HttpError(422,"invalid","Invalid date range");return NextResponse.json(await readExceptions(userId,from,to));}catch(error){return errorResponse(error);}}
export async function POST(request:Request){try{const principal=await requirePrincipal(request);verifyCsrf(request,principal);return NextResponse.json(await addException(principal.id,await request.json()),{status:201});}catch(error){return errorResponse(error);}}
