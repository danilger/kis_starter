import { Hono } from "hono";
import { implement } from "../../lib/contract";
import {
  loginContract,
  logoutContract,
  meContract,
  refreshContract,
  registerContract,
} from "./contract/endpoints";
import * as authService from "./auth.service";
import { AuthError } from "./auth.service";

function getBearerToken(authorization: string | undefined): string | null {
  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }
  const token = authorization.slice("Bearer ".length).trim();
  return token.length > 0 ? token : null;
}

export const authRoutes = new Hono()
  .post(
    "/auth/register",
    implement(registerContract, async ({ json }) => {
      try {
        const tokens = await authService.register(json);
        return { status: 201 as const, body: tokens };
      } catch (error) {
        if (error instanceof AuthError && error.status === 409) {
          return {
            status: 409 as const,
            body: { error: error.message, code: error.code },
          };
        }
        throw error;
      }
    }),
  )
  .post(
    "/auth/login",
    implement(loginContract, async ({ json }) => {
      try {
        const tokens = await authService.login(json);
        return { status: 200 as const, body: tokens };
      } catch (error) {
        if (error instanceof AuthError && error.status === 401) {
          return {
            status: 401 as const,
            body: { error: error.message, code: error.code },
          };
        }
        throw error;
      }
    }),
  )
  .post(
    "/auth/refresh",
    implement(refreshContract, async ({ json }) => {
      try {
        const tokens = await authService.refresh(json.refreshToken);
        return { status: 200 as const, body: tokens };
      } catch (error) {
        if (error instanceof AuthError && error.status === 401) {
          return {
            status: 401 as const,
            body: { error: error.message, code: error.code },
          };
        }
        throw error;
      }
    }),
  )
  .post(
    "/auth/logout",
    implement(logoutContract, async ({ json }) => {
      await authService.logout(json.refreshToken);
      return { status: 200 as const, body: { ok: true as const } };
    }),
  )
  .get(
    "/auth/me",
    implement(meContract, async ({ c }) => {
      const token = getBearerToken(c.req.header("Authorization"));
      if (!token) {
        return {
          status: 401 as const,
          body: { error: "Missing bearer token", code: "UNAUTHORIZED" },
        };
      }
      try {
        const user = await authService.me(token);
        return { status: 200 as const, body: user };
      } catch (error) {
        if (error instanceof AuthError && error.status === 401) {
          return {
            status: 401 as const,
            body: { error: error.message, code: error.code },
          };
        }
        throw error;
      }
    }),
  );
