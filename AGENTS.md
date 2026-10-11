# Agent instructions

This repository follows [ARCHITECTURE.md](./ARCHITECTURE.md).

## Principles

- **KISS / YAGNI:** no layers, DI, CQRS, or repositories by default.
- **Progressive architecture:** start simple; add `service` / `domain` only when complexity appears.
- **Vertical slices:** keep feature code colocated under `src/server/modules/<name>/`.
- **Contract-first API:** declare the Zod contract before writing the handler.
- **Explicit dependencies:** plain functions and imports; no DI containers.
- **Minimal diffs:** change only what the task needs; no drive-by refactors.

## Module layout (required)

Every backend module keeps API contracts in a dedicated folder:

```text
src/server/modules/<name>/
├── contract/
│   ├── schema.ts      # Zod bodies / entities / shared response shapes
│   └── endpoints.ts   # RouteContract per endpoint (input + responses)
├── <name>.routes.ts   # implement(contract, handler)
├── <name>.service.ts  # optional — business logic
├── <name>.table.ts    # optional — Drizzle tables
└── index.ts           # public module API (only for cross-module exports)
```

Import directly — no `contract/index.ts` barrel:

```ts
from "./contract/schema"
from "./contract/endpoints"
```

Examples:

- [auth/contract/schema.ts](./src/server/modules/auth/contract/schema.ts)
- [auth/contract/endpoints.ts](./src/server/modules/auth/contract/endpoints.ts)

Do **not** put `*.schema.ts` / `*.contract.ts` at the module root. Always use `contract/`.
Do **not** add `contract/index.ts` re-exports.

## Contract-first workflow (backend endpoints)

For every HTTP endpoint:

1. Add/adjust Zod schemas in `contract/schema.ts`.
2. Declare the route contract in `contract/endpoints.ts`:
   - `input` — request (`json` / `query` / `param`)
   - `responses` — map of HTTP status → Zod schema
3. Implement the handler in `*.routes.ts` with `implement(contract, handler)`.
4. Handler returns `{ status, body }` only for statuses listed in the contract.
5. Do **not** call raw `c.json()` for contract responses — `implement` validates against the contract.
6. Declare every runtime status in `responses` (include `400` when there is request input, and `500` for response-validation failures).

Helper: [src/server/lib/contract.ts](./src/server/lib/contract.ts)

Human/reviewer owns `contract/`. Agent fills in service + `implement(...)` to satisfy it.

### Auth session rules

- Access JWT: client memory only (never `localStorage`).
- Refresh token: `HttpOnly` cookie (`Path=/api/auth`), not in JSON.
- Refresh rotation and register+session must use a DB transaction.
- Mutating auth routes use `implementAuth` (CSRF Origin/Referer → contract `403 CSRF_REJECTED`).
- Cross-module imports: only via the target module’s `index.ts` (enforced by ESLint `boundaries/entry-point`).

### Contract guarantee scope

Runtime Zod contracts apply to handlers going through `implement` / `implementAuth`.
They do **not** automatically cover global Hono `onError` / `notFound` responses.

## Layout

- Backend: `src/server/`
- Frontend: `src/client/` (simplified FSD: `app` / `pages` / `features` / `shared`)
- Specs: `openspec/`

## Quality gates

Before finishing a task, run:

```bash
bun run typecheck
bun run lint
bun run test
bun run build
```

## Do not

- Add NestJS, CommandBus, repository interfaces, or Base* classes.
- Create empty directories or stub files “for later”.
- Import server runtime code from the client (type-only `AppType` from `src/server/app.ts` is allowed).
- Cross-import private files of another server module; use that module’s `index.ts`.
- Implement endpoints without an entry in `contract/endpoints.ts`.
- Place module schemas/contracts outside `modules/<name>/contract/`.
- Add barrel `contract/index.ts` that hides direct imports.
