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
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/refresh` | Refresh tokens |
| POST | `/api/auth/logout` | Invalidate refresh token |
| GET | `/api/auth/me` | Current user (Bearer access token) |
