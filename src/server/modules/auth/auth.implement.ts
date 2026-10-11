import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { z } from "zod";
import { implement, respondDeclared, type RouteContract } from "../../lib/contract";
import { isAllowedAuthOrigin, isMutatingMethod } from "./auth.csrf";

type InputDef = {
  json?: z.ZodType;
  query?: z.ZodType;
  param?: z.ZodType;
};

/**
 * Like `implement`, but for mutating auth routes enforces CSRF Origin/Referer
 * and returns contract-declared `403 CSRF_REJECTED` when rejected.
 */
export function implementAuth<
  TInput extends InputDef,
  TResponses extends Partial<Record<ContentfulStatusCode, z.ZodType>> & {
    403: z.ZodType;
  },
>(
  contract: RouteContract<TInput, TResponses>,
  handler: Parameters<typeof implement<TInput, TResponses>>[1],
): ReturnType<typeof implement<TInput, TResponses>> {
  const run = implement(contract, handler);

  return (async (c: Context) => {
    if (isMutatingMethod(c.req.method) && !isAllowedAuthOrigin(c)) {
      return respondDeclared(c, contract, 403, {
        error: "CSRF validation failed",
        code: "CSRF_REJECTED",
      });
    }
    return run(c);
  }) as ReturnType<typeof implement<TInput, TResponses>>;
}
