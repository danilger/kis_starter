# kis_starter

KISS agent-first fullstack starter: Bun + Hono + React + Drizzle with strict Zod API contracts and a modular monolith layout.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full specification.

## Requirements

- [Bun](https://bun.sh) 1.1+

## Setup

```bash
bun install
cp .env.example .env
bun run db:migrate
```

## Development

```bash
bun run dev
```

- API: `http://localhost:8787/api` (default; override with `PORT`)
- Client: `http://localhost:5173` (proxies `/api` to the server)

Auth: access JWT is kept in memory on the client; refresh token is an `HttpOnly` cookie (`credentials: "include"`). Mutating auth routes check `Origin`/`Referer` against `CORS_ORIGIN`.

## Quality gates

```bash
bun run typecheck
bun run lint
bun run test
bun run build
```

## Auth endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Create account; sets refresh cookie |
| POST | `/api/auth/login` | Login; sets refresh cookie |
| POST | `/api/auth/refresh` | Rotate refresh cookie; return new access JWT |
| POST | `/api/auth/logout` | Clear refresh cookie / revoke token |
| GET | `/api/auth/me` | Current user (`Authorization: Bearer` access token) |
