import type { RouteContract } from "../../../lib/contract";
import { healthOkSchema } from "./schema";

/** Contract first — implement in health.routes.ts */
export const healthContract = {
  responses: {
    200: healthOkSchema,
  },
} as const satisfies RouteContract<Record<string, never>, { 200: typeof healthOkSchema }>;
