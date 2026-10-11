import "./setup";
import { beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { app } from "../src/server/app";
import { db } from "../src/server/db";
import { refreshTokens, users } from "../src/server/modules/auth/auth.table";
import { authHeaders, cookieFromResponse } from "./auth.helpers";

beforeAll(() => {
  migrate(db, { migrationsFolder: "./src/server/db/migrations" });
});

beforeEach(async () => {
  await db.delete(refreshTokens);
  await db.delete(users);
});

describe("auth contracts", () => {
  test("invalid register body is rejected", async () => {
    const res = await app.request("/api/auth/register", {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ email: "not-an-email", password: "short" }),
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as { code?: string };
    expect(body.code).toBe("VALIDATION_ERROR");
  });

  test("csrf rejects mutating auth without origin", async () => {
    const res = await app.request("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "a@example.com", password: "password123" }),
    });
    expect(res.status).toBe(403);
  });

  test("valid register then me refresh logout flow uses HttpOnly cookie", async () => {
    const registerRes = await app.request("/api/auth/register", {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ email: "dana@example.com", password: "password123" }),
    });

    expect(registerRes.status).toBe(201);
    const session = (await registerRes.json()) as {
      accessToken: string;
      user: { email: string };
      refreshToken?: string;
    };
    expect(session.user.email).toBe("dana@example.com");
    expect(session.refreshToken).toBeUndefined();

    const refreshCookie = cookieFromResponse(registerRes, "refresh_token");
    expect(refreshCookie).toBeTruthy();

    const meRes = await app.request("/api/auth/me", {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
      },
    });
    expect(meRes.status).toBe(200);

    const refreshRes = await app.request("/api/auth/refresh", {
      method: "POST",
      headers: authHeaders({
        Cookie: `refresh_token=${refreshCookie}`,
      }),
    });
    expect(refreshRes.status).toBe(200);
    const refreshed = (await refreshRes.json()) as { accessToken: string; refreshToken?: string };
    expect(refreshed.refreshToken).toBeUndefined();
    const rotated = cookieFromResponse(refreshRes, "refresh_token");
    expect(rotated).toBeTruthy();
    expect(rotated).not.toBe(refreshCookie);

    const reuseOld = await app.request("/api/auth/refresh", {
      method: "POST",
      headers: authHeaders({
        Cookie: `refresh_token=${refreshCookie}`,
      }),
    });
    expect(reuseOld.status).toBe(401);

    const logoutRes = await app.request("/api/auth/logout", {
      method: "POST",
      headers: authHeaders({
        Cookie: `refresh_token=${rotated}`,
      }),
    });
    expect(logoutRes.status).toBe(200);

    const afterLogout = await app.request("/api/auth/refresh", {
      method: "POST",
      headers: authHeaders({
        Cookie: `refresh_token=${rotated}`,
      }),
    });
    expect(afterLogout.status).toBe(401);
  });
});
