import type { Context, Next } from "hono";
import { jsonResponse, errorBodySchema } from "../../lib/contract";

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function allowedOrigins(): string[] {
  const fromEnv = process.env.CORS_ORIGIN?.split(",").map((s) => s.trim()).filter(Boolean);
  return fromEnv && fromEnv.length > 0 ? fromEnv : ["http://localhost:5173"];
}

/**
 * Origin/Referer allowlist for cookie-authenticated mutating auth requests.
 * Same-site Vite proxy + SameSite=Lax cookies; blocks cross-site form CSRF.
 */
export async function authCsrfGuard(c: Context, next: Next) {
  if (!MUTATING.has(c.req.method)) {
    return next();
  }

  const origin = c.req.header("Origin");
  const referer = c.req.header("Referer");
  const allowed = allowedOrigins();

  const ok =
    (origin !== undefined && allowed.includes(origin)) ||
    (referer !== undefined && allowed.some((a) => referer.startsWith(`${a}/`) || referer === a));

  if (!ok) {
    return jsonResponse(
      c,
      errorBodySchema,
      { error: "CSRF validation failed", code: "CSRF_REJECTED" },
      403,
    );
  }

  return next();
}
