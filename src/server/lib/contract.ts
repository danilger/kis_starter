import type { Context, TypedResponse } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { z } from "zod";

export const errorBodySchema = z.object({
  error: z.string(),
  code: z.string().optional(),
});

export type ErrorBody = z.infer<typeof errorBodySchema>;

type InputDef = {
  json?: z.ZodType;
  query?: z.ZodType;
  param?: z.ZodType;
};

/**
 * Explicit route contract: declare Zod request + response map first,
 * then implement against it with `implement(contract, handler)`.
 * Declared `responses` must include every status the runtime may return
 * (typically 400 for validation and 500 for response-validation failures).
 */
export type RouteContract<
  TInput extends InputDef = InputDef,
  TResponses extends Partial<Record<ContentfulStatusCode, z.ZodType>> = Partial<
    Record<ContentfulStatusCode, z.ZodType>
  >,
> = {
  input?: TInput;
  responses: TResponses;
};

type HandlerInput<TInput extends InputDef> = {
  c: Context;
  json: TInput["json"] extends z.ZodType ? z.infer<TInput["json"]> : undefined;
  query: TInput["query"] extends z.ZodType ? z.infer<TInput["query"]> : undefined;
  param: TInput["param"] extends z.ZodType ? z.infer<TInput["param"]> : undefined;
};

type HandlerResult<TResponses extends Partial<Record<ContentfulStatusCode, z.ZodType>>> = {
  [S in keyof TResponses]-?: TResponses[S] extends z.ZodType
    ? { status: S; body: z.infer<TResponses[S]> }
    : never;
}[keyof TResponses];

type ContractTypedResponse<TResponses extends Partial<Record<ContentfulStatusCode, z.ZodType>>> = {
  [S in keyof TResponses]-?: S extends ContentfulStatusCode
    ? TResponses[S] extends z.ZodType
      ? TypedResponse<z.infer<TResponses[S]>, S, "json">
      : never
    : never;
}[keyof TResponses];

/** Validate and send a response for a status declared on the contract. */
export function respondDeclared<TResponses extends Partial<Record<ContentfulStatusCode, z.ZodType>>>(
  c: Context,
  contract: RouteContract<InputDef, TResponses>,
  status: ContentfulStatusCode,
  body: unknown,
) {
  const schema = contract.responses[status];
  if (!schema) {
    console.error("Response status not declared in contract", status);
    const fallback = contract.responses[500];
    if (fallback) {
      return jsonResponse(
        c,
        fallback,
        { error: "Internal response validation failed", code: "UNDECLARED_STATUS" },
        500,
      );
    }
    return c.json(
      { error: "Internal response validation failed", code: "UNDECLARED_STATUS" } satisfies ErrorBody,
      500,
    );
  }
  return jsonResponse(c, schema, body as z.infer<typeof schema>, status);
}

/**
 * Runtime-validated JSON response. On schema mismatch returns a generic 500
 * without leaking the invalid payload to the client.
 */
export function jsonResponse<T extends z.ZodType, S extends ContentfulStatusCode>(
  c: Context,
  schema: T,
  data: z.infer<T>,
  status: S,
) {
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    console.error("Response validation failed", parsed.error.flatten());
    return c.json(
      { error: "Internal response validation failed", code: "RESPONSE_VALIDATION" } satisfies ErrorBody,
      500,
    );
  }
  return c.json(parsed.data as z.infer<T>, status);
}

export function jsonError<S extends ContentfulStatusCode>(
  c: Context,
  body: ErrorBody,
  status: S,
) {
  return jsonResponse(c, errorBodySchema, body, status);
}

async function parseTarget<T extends z.ZodType>(
  c: Context,
  schema: T,
  read: () => Promise<unknown> | unknown,
): Promise<{ ok: true; data: z.infer<T> } | { ok: false }> {
  let raw: unknown;
  try {
    raw = await read();
  } catch {
    return { ok: false };
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false };
  }

  return { ok: true, data: parsed.data as z.infer<T> };
}

/**
 * Bind a handler to an explicit contract.
 * Request is validated from `contract.input`; response from `contract.responses[status]`.
 */
export function implement<
  TInput extends InputDef,
  TResponses extends Partial<Record<ContentfulStatusCode, z.ZodType>>,
>(
  contract: RouteContract<TInput, TResponses>,
  handler: (
    input: HandlerInput<TInput>,
  ) => HandlerResult<TResponses> | Promise<HandlerResult<TResponses>>,
): (c: Context) => Promise<ContractTypedResponse<TResponses>> {
  return async (c) => {
    let json = undefined as HandlerInput<TInput>["json"];
    let query = undefined as HandlerInput<TInput>["query"];
    let param = undefined as HandlerInput<TInput>["param"];

    if (contract.input?.json) {
      const parsed = await parseTarget(c, contract.input.json, () => c.req.json());
      if (!parsed.ok) {
        return respondDeclared(c, contract, 400, {
          error: "Invalid request",
          code: "VALIDATION_ERROR",
        }) as unknown as ContractTypedResponse<TResponses>;
      }
      json = parsed.data as HandlerInput<TInput>["json"];
    }

    if (contract.input?.query) {
      const parsed = await parseTarget(c, contract.input.query, () => c.req.query());
      if (!parsed.ok) {
        return respondDeclared(c, contract, 400, {
          error: "Invalid request",
          code: "VALIDATION_ERROR",
        }) as unknown as ContractTypedResponse<TResponses>;
      }
      query = parsed.data as HandlerInput<TInput>["query"];
    }

    if (contract.input?.param) {
      const parsed = await parseTarget(c, contract.input.param, () => c.req.param());
      if (!parsed.ok) {
        return respondDeclared(c, contract, 400, {
          error: "Invalid request",
          code: "VALIDATION_ERROR",
        }) as unknown as ContractTypedResponse<TResponses>;
      }
      param = parsed.data as HandlerInput<TInput>["param"];
    }

    const result = await handler({ c, json, query, param });
    const status = result.status as ContentfulStatusCode;
    const schema = contract.responses[status];

    if (!schema) {
      return respondDeclared(c, contract, 500, {
        error: "Internal response validation failed",
        code: "UNDECLARED_STATUS",
      }) as unknown as ContractTypedResponse<TResponses>;
    }

    const parsed = schema.safeParse(result.body);
    if (!parsed.success) {
      console.error("Response validation failed", parsed.error.flatten());
      return respondDeclared(c, contract, 500, {
        error: "Internal response validation failed",
        code: "RESPONSE_VALIDATION",
      }) as unknown as ContractTypedResponse<TResponses>;
    }

    return c.json(
      parsed.data,
      status,
    ) as unknown as ContractTypedResponse<TResponses>;
  };
}
