import "./setup";
import { beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { Hono } from "hono";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { z } from "zod";
import { app } from "../src/server/app";
import { db } from "../src/server/db";
import { implement } from "../src/server/lib/contract";
import { refreshTokens, users } from "../src/server/modules/auth/auth.table";

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
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "not-an-email", password: "short" }),
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as { code?: string };
    expect(body.code).toBe("VALIDATION_ERROR");
  });

  test("valid register then me flow", async () => {
    const registerRes = await app.request("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "dana@example.com", password: "password123" }),
    });

    expect(registerRes.status).toBe(201);
    const tokens = (await registerRes.json()) as {
      accessToken: string;
      refreshToken: string;
      user: { email: string };
    };
    expect(tokens.user.email).toBe("dana@example.com");

    const meRes = await app.request("/api/auth/me", {
      headers: { Authorization: `Bearer ${tokens.accessToken}` },
    });
    expect(meRes.status).toBe(200);

    const refreshRes = await app.request("/api/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: tokens.refreshToken }),
    });
    expect(refreshRes.status).toBe(200);
    const refreshed = (await refreshRes.json()) as { refreshToken: string };

    const logoutRes = await app.request("/api/auth/logout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: refreshed.refreshToken }),
    });
    expect(logoutRes.status).toBe(200);
  });

  test("invalid response shape never returns as success payload", async () => {
    const brokenContract = {
      responses: {
        200: z.object({ id: z.string() }),
      },
    };

    const broken = new Hono().get(
      "/broken",
      implement(brokenContract, () => ({
        status: 200 as const,
        body: { id: 123 } as unknown as { id: string },
      })),
    );

    const res = await broken.request("/broken");
    expect(res.status).toBe(500);
    const body = (await res.json()) as { code?: string; id?: unknown };
    expect(body.code).toBe("RESPONSE_VALIDATION");
    expect(body.id).toBeUndefined();
  });
});
