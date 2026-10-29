import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class HttpError extends Error {
  constructor(public status: number, public code: string, message: string, public details?: Record<string, unknown>) {
    super(message);
  }
}

export function errorResponse(error: unknown): NextResponse {
  if (error instanceof ZodError) {
    return NextResponse.json({code:"invalid",message:"Invalid input",details:{issues:error.issues}},{status:422});
  }
  if (error instanceof HttpError) {
    return NextResponse.json({ code: error.code, message: error.message, ...(error.details ? { details: error.details } : {}) }, { status: error.status });
  }
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = (error as { code?: string }).code;
    if (code === "23505" || code === "23P01") {
      return NextResponse.json({ code: "conflict", message: "The record conflicts with existing data" }, { status: 409 });
    }
    if (code === "23503" || code === "23514" || code === "22P02") {
      return NextResponse.json({ code: "invalid", message: "Invalid input" }, { status: 422 });
    }
  }
  console.error(error);
  return NextResponse.json({ code: "internal_error", message: "Internal server error" }, { status: 500 });
}
