import { Hono } from "hono";
import { implement } from "../../lib/contract";
import { healthContract } from "./contract/endpoints";

export const healthRoutes = new Hono().get(
  "/health",
  implement(healthContract, () => ({
    status: 200 as const,
    body: { status: "ok" as const },
  })),
);
