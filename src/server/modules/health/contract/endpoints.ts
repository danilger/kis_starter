import { errorBodySchema, type RouteContract } from "../../../lib/contract";
import { healthOkSchema } from "./schema";

/** Contract first — implement in health.routes.ts */
export const healthContract = {
  responses: {
    200: healthOkSchema,
    500: errorBodySchema,
  },
} as const satisfies RouteContract<
  Record<string, never>,
  {
    200: typeof healthOkSchema;
    500: typeof errorBodySchema;
  }
>;
