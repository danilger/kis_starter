import type { Context } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { REFRESH_TTL_MS } from "../../lib/tokens";

export const REFRESH_COOKIE = "refresh_token";

function cookieOpts() {
  return {
    httpOnly: true,
    path: "/api/auth",
    sameSite: "Lax" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge: Math.floor(REFRESH_TTL_MS / 1000),
  };
}

export function setRefreshCookie(c: Context, token: string): void {
  setCookie(c, REFRESH_COOKIE, token, cookieOpts());
}

export function clearRefreshCookie(c: Context): void {
  deleteCookie(c, REFRESH_COOKIE, {
    path: "/api/auth",
    secure: process.env.NODE_ENV === "production",
    sameSite: "Lax",
  });
}

export function readRefreshCookie(c: Context): string | undefined {
  const value = getCookie(c, REFRESH_COOKIE);
  return value && value.length > 0 ? value : undefined;
}
