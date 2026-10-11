import type { Context } from "hono";

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function allowedOrigins(): string[] {
  const fromEnv = process.env.CORS_ORIGIN?.split(",").map((s) => s.trim()).filter(Boolean);
  return fromEnv && fromEnv.length > 0 ? fromEnv : ["http://localhost:5173"];
}

export function isMutatingMethod(method: string): boolean {
  return MUTATING.has(method);
}

/**
 * Origin/Referer allowlist for cookie-authenticated mutating auth requests.
 * Same-site Vite proxy + SameSite=Lax cookies; blocks cross-site form CSRF.
 */
export function isAllowedAuthOrigin(c: Context): boolean {
  const origin = c.req.header("Origin");
  const referer = c.req.header("Referer");
  const allowed = allowedOrigins();

  return (
    (origin !== undefined && allowed.includes(origin)) ||
    (referer !== undefined && allowed.some((a) => referer.startsWith(`${a}/`) || referer === a))
  );
}
