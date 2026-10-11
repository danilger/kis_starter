import { errorBodySchema, type RouteContract } from "../../../lib/contract";
import {
  authSessionSchema,
  loginBodySchema,
  logoutOkSchema,
  registerBodySchema,
  userResponseSchema,
} from "./schema";

/** Write / review these contracts before implementing handlers. */

export const registerContract = {
  input: { json: registerBodySchema },
  responses: {
    201: authSessionSchema,
    400: errorBodySchema,
    403: errorBodySchema,
    409: errorBodySchema,
    500: errorBodySchema,
  },
} as const satisfies RouteContract<
  { json: typeof registerBodySchema },
  {
    201: typeof authSessionSchema;
    400: typeof errorBodySchema;
    403: typeof errorBodySchema;
    409: typeof errorBodySchema;
    500: typeof errorBodySchema;
  }
>;

export const loginContract = {
  input: { json: loginBodySchema },
  responses: {
    200: authSessionSchema,
    400: errorBodySchema,
    401: errorBodySchema,
    403: errorBodySchema,
    500: errorBodySchema,
  },
} as const satisfies RouteContract<
  { json: typeof loginBodySchema },
  {
    200: typeof authSessionSchema;
    400: typeof errorBodySchema;
    401: typeof errorBodySchema;
    403: typeof errorBodySchema;
    500: typeof errorBodySchema;
  }
>;

export const refreshContract = {
  responses: {
    200: authSessionSchema,
    401: errorBodySchema,
    403: errorBodySchema,
    500: errorBodySchema,
  },
} as const satisfies RouteContract<
  Record<string, never>,
  {
    200: typeof authSessionSchema;
    401: typeof errorBodySchema;
    403: typeof errorBodySchema;
    500: typeof errorBodySchema;
  }
>;

export const logoutContract = {
  responses: {
    200: logoutOkSchema,
    403: errorBodySchema,
    500: errorBodySchema,
  },
} as const satisfies RouteContract<
  Record<string, never>,
  {
    200: typeof logoutOkSchema;
    403: typeof errorBodySchema;
    500: typeof errorBodySchema;
  }
>;

export const meContract = {
  responses: {
    200: userResponseSchema,
    401: errorBodySchema,
    500: errorBodySchema,
  },
} as const satisfies RouteContract<
  Record<string, never>,
  {
    200: typeof userResponseSchema;
    401: typeof errorBodySchema;
    500: typeof errorBodySchema;
  }
>;
