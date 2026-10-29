import { timingSafeEqual } from "node:crypto";
import { HttpError } from "./errors";
import { hashCsrf, type Principal } from "./session";

export function verifyCsrf(request: Request, principal: Principal): void {
  const origin = request.headers.get("origin");
  const expected = process.env.APP_ORIGIN;
  if (!origin || !expected || origin !== expected) throw new HttpError(403, "csrf", "Invalid request origin");
  const token = request.headers.get("x-csrf-token");
  if (!token) throw new HttpError(403, "csrf", "CSRF token required");
  const actual = Buffer.from(hashCsrf(token), "hex");
  const stored = Buffer.from(principal.csrfTokenHash, "hex");
  if (stored.length !== actual.length || !timingSafeEqual(stored, actual)) throw new HttpError(403, "csrf", "Invalid CSRF token");
}
