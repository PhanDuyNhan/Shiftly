import { NextResponse } from "next/server";
import { clearSessionCookies, requirePrincipal, revokeSession } from "@/server/auth/session";
import { verifyCsrf } from "@/server/auth/csrf";
import { errorResponse } from "@/server/auth/errors";

export async function POST(request: Request) {
  try {
    const principal = await requirePrincipal(request, true);
    verifyCsrf(request, principal);
    await revokeSession(principal);
    const response = NextResponse.json({ ok: true });
    clearSessionCookies(response);
    return response;
  } catch (error) { return errorResponse(error); }
}
