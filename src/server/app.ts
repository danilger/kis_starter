import { Hono } from "hono";
import { cors } from "hono/cors";
import { healthRoutes } from "./modules/health/health.routes";
import { authRoutes } from "./modules/auth";

const app = new Hono()
  .use(
    "/api/*",
    cors({
      origin: ["http://localhost:5173"],
      allowHeaders: ["Content-Type", "Authorization"],
      allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    }),
  )
  .route("/api", healthRoutes)
  .route("/api", authRoutes);

export type AppType = typeof app;
export { app };
