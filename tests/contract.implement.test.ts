import { describe, expect, test } from "bun:test";
import { Hono } from "hono";
import { z } from "zod";
import { errorBodySchema, implement } from "../src/server/lib/contract";

describe("implement() contract helper", () => {
  test("invalid response shape returns 500 without leaking payload", async () => {
    const contract = {
      responses: {
        200: z.object({ id: z.string() }),
        500: errorBodySchema,
      },
    };

    const app = new Hono().get(
      "/broken",
      implement(contract, () => ({
        status: 200 as const,
        body: { id: 123 } as unknown as { id: string },
      })),
    );

    const res = await app.request("/broken");
    expect(res.status).toBe(500);
    const body = (await res.json()) as { code?: string; id?: unknown };
    expect(body.code).toBe("RESPONSE_VALIDATION");
    expect(body.id).toBeUndefined();
  });

  test("undeclared handler status returns UNDECLARED_STATUS", async () => {
    const contract = {
      responses: {
        200: z.object({ ok: z.literal(true) }),
        500: errorBodySchema,
      },
    };

    const app = new Hono().get(
      "/bad-status",
      implement(contract, () => ({
        status: 201 as never,
        body: { ok: true } as never,
      })),
    );

    const res = await app.request("/bad-status");
    expect(res.status).toBe(500);
    const body = (await res.json()) as { code?: string };
    expect(body.code).toBe("UNDECLARED_STATUS");
  });

  test("invalid json body returns 400 when declared", async () => {
    const contract = {
      input: { json: z.object({ name: z.string().min(2) }) },
      responses: {
        200: z.object({ name: z.string() }),
        400: errorBodySchema,
        500: errorBodySchema,
      },
    };

    const app = new Hono().post(
      "/echo",
      implement(contract, ({ json }) => ({
        status: 200 as const,
        body: { name: json.name },
      })),
    );

    const res = await app.request("/echo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "a" }),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { code?: string };
    expect(body.code).toBe("VALIDATION_ERROR");
  });

  test("malformed json returns 400", async () => {
    const contract = {
      input: { json: z.object({ name: z.string() }) },
      responses: {
        200: z.object({ name: z.string() }),
        400: errorBodySchema,
        500: errorBodySchema,
      },
    };

    const app = new Hono().post(
      "/echo",
      implement(contract, ({ json }) => ({
        status: 200 as const,
        body: { name: json.name },
      })),
    );

    const res = await app.request("/echo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{not-json",
    });
    expect(res.status).toBe(400);
  });

  test("unexpected throw is not a successful response", async () => {
    const contract = {
      responses: {
        200: z.object({ ok: z.literal(true) }),
        500: errorBodySchema,
      },
    };

    const app = new Hono()
      .onError((err, c) => c.json({ error: err.message, code: "UNHANDLED" }, 500))
      .get(
        "/boom",
        implement(contract, () => {
          throw new Error("boom");
        }),
      );

    const res = await app.request("/boom");
    expect(res.status).toBe(500);
    const body = (await res.json()) as { code?: string; ok?: unknown };
    expect(body.ok).toBeUndefined();
    expect(body.code).toBe("UNHANDLED");
  });

  test("zod transform is applied to handler input", async () => {
    const contract = {
      input: {
        json: z.object({
          email: z.string().transform((v) => v.trim().toLowerCase()),
        }),
      },
      responses: {
        200: z.object({ email: z.string() }),
        400: errorBodySchema,
        500: errorBodySchema,
      },
    };

    const app = new Hono().post(
      "/norm",
      implement(contract, ({ json }) => ({
        status: 200 as const,
        body: { email: json.email },
      })),
    );

    const res = await app.request("/norm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "  Ada@Example.COM " }),
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ email: "ada@example.com" });
  });

  test("declared error status is reachable", async () => {
    const contract = {
      responses: {
        200: z.object({ ok: z.literal(true) }),
        401: errorBodySchema,
        500: errorBodySchema,
      },
    };

    const app = new Hono().get(
      "/authz",
      implement(contract, () => ({
        status: 401 as const,
        body: { error: "nope", code: "DENIED" },
      })),
    );

    const res = await app.request("/authz");
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "nope", code: "DENIED" });
  });
});
