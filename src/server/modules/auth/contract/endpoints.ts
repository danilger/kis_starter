import { errorBodySchema, type RouteContract } from "../../../lib/contract";
import {
  loginBodySchema,
  logoutBodySchema,
  logoutOkSchema,
  refreshBodySchema,
  registerBodySchema,
  tokenPairSchema,
  userResponseSchema,
} from "./schema";

/** Write / review these contracts before implementing handlers. */

export const registerContract = {
  input: { json: registerBodySchema },
  responses: {
    201: tokenPairSchema,
    400: errorBodySchema,
    409: errorBodySchema,
  },
} as const satisfies RouteContract<
  { json: typeof registerBodySchema },
  {
    201: typeof tokenPairSchema;
    400: typeof errorBodySchema;
    409: typeof errorBodySchema;
  }
>;

export const loginContract = {
  input: { json: loginBodySchema },
  responses: {
    200: tokenPairSchema,
    400: errorBodySchema,
    401: errorBodySchema,
  },
} as const satisfies RouteContract<
  { json: typeof loginBodySchema },
  {
    200: typeof tokenPairSchema;
    400: typeof errorBodySchema;
    401: typeof errorBodySchema;
  }
>;

export const refreshContract = {
  input: { json: refreshBodySchema },
  responses: {
    200: tokenPairSchema,
    400: errorBodySchema,
    401: errorBodySchema,
  },
} as const satisfies RouteContract<
  { json: typeof refreshBodySchema },
  {
    200: typeof tokenPairSchema;
    400: typeof errorBodySchema;
    401: typeof errorBodySchema;
  }
>;

export const logoutContract = {
  input: { json: logoutBodySchema },
  responses: {
    200: logoutOkSchema,
    400: errorBodySchema,
  },
} as const satisfies RouteContract<
  { json: typeof logoutBodySchema },
  {
    200: typeof logoutOkSchema;
    400: typeof errorBodySchema;
  }
>;

export const meContract = {
  responses: {
    200: userResponseSchema,
    401: errorBodySchema,
  },
} as const satisfies RouteContract<
  Record<string, never>,
  {
    200: typeof userResponseSchema;
    401: typeof errorBodySchema;
  }
>;
