# Тур по приложению

Гид по текущему scaffold. Ссылки ведут на файлы в репозитории — в VS Code / Cursor открывай через `Ctrl+Click` (macOS: `Cmd+Click`) или из Markdown Preview.

Полная спецификация: [ARCHITECTURE.md](ARCHITECTURE.md). Правила для агентов: [AGENTS.md](AGENTS.md).

---

## 1. Что это за проект

Один fullstack-пакет (без workspaces):

| Слой | Стек | Где лежит |
|------|------|-----------|
| Backend | Bun + Hono + Zod + Drizzle/SQLite | [src/server/](src/server/) |
| Frontend | React + Vite + Hono RPC | [src/client/](src/client/) |
| Тесты | Bun test | [tests/](tests/) |
| Спеки | OpenSpec (заготовка) | [openspec/](openspec/) |

Скрипты и зависимости: [package.json](package.json).

Запуск:

```bash
bun install
bun run db:migrate
bun run dev          # API :8787 + Vite :5173
```

Конфиг окружения: [.env.example](.env.example).

---

## 2. Карта каталогов

```text
src/
├── server/          # HTTP API, БД, бизнес-логика
│   ├── index.ts     # точка входа Bun.serve
│   ├── app.ts       # сборка роутов + AppType для RPC
│   ├── lib/         # implement(), пароли, JWT
│   ├── db/          # Drizzle + миграции
│   └── modules/
│       └── <name>/
│           ├── contract/   # schema + endpoints (сначала)
│           ├── *.routes.ts
│           ├── *.service.ts
│           └── *.table.ts
└── client/          # упрощённый FSD
    ├── main.tsx
    ├── app/         # shell, роутинг, стили
    ├── pages/       # страницы
    ├── features/    # фичи (auth)
    └── shared/      # общий API-клиент
```

---

## 3. Backend: от входа до ответа

### 3.1. Точка входа

[src/server/index.ts](src/server/index.ts) — поднимает HTTP-сервер на `PORT` (по умолчанию `8787`) и отдаёт запросы в Hono-приложение.

### 3.2. Сборка приложения

[src/server/app.ts](src/server/app.ts):

1. CORS для Vite (`localhost:5173`).
2. Монтирует модули на `/api`.
3. Экспортирует `AppType` — тип всего API для frontend RPC.

Цепочка роутов должна оставаться «сцепленной» (`.route(...).route(...)`), иначе Hono RPC потеряет типы.

### 3.3. Контракты (обязательная часть) — contract-first

Поток работы:

1. Zod-схемы — `modules/<name>/contract/schema.ts`
2. Endpoint-контракты — `modules/<name>/contract/endpoints.ts` (`input` + `responses`)
3. Реализация — `implement(contract, handler)` в `*.routes.ts`

Ядро helper’а: [src/server/lib/contract.ts](src/server/lib/contract.ts)

- `RouteContract` — тип контракта (request + map ответов).
- `implement(contract, handler)` — валидирует request по `input`, response по `responses[status]`.
- Handler возвращает только `{ status, body }` из объявленной карты.
- В `responses` нужно явно перечислять `400`/`500`, если runtime их может вернуть.
- Битый response → `500` (`RESPONSE_VALIDATION`) по схеме контракта, без утечки payload.

Папки контрактов модулей:

- [auth/contract/](src/server/modules/auth/contract/)
- [health/contract/](src/server/modules/health/contract/)

### 3.4. Инфраструктурные утилиты

| Файл | Роль |
|------|------|
| [src/server/lib/password.ts](src/server/lib/password.ts) | Хеш/проверка пароля (`Bun.password`, изолировано в одном файле) |
| [src/server/lib/tokens.ts](src/server/lib/tokens.ts) | Access JWT (`jose`) + генерация refresh token |

### 3.5. База данных

| Файл | Роль |
|------|------|
| [src/server/db/index.ts](src/server/db/index.ts) | SQLite через `bun:sqlite` + Drizzle |
| [src/server/db/schema.ts](src/server/db/schema.ts) | Центральный re-export таблиц модулей |
| [src/server/db/migrate.ts](src/server/db/migrate.ts) | Применение миграций (`bun run db:migrate`) |
| [drizzle.config.ts](drizzle.config.ts) | Конфиг drizzle-kit |
| [src/server/db/migrations/](src/server/db/migrations/) | SQL-миграции |

Таблицы живут рядом с модулем (vertical slice), а не в отдельном «слое domain».

---

## 4. Модули backend

Архитектура — **modular monolith** + **progressive architecture**:

- Level 1: один файл роутов (пример — health).
- Level 2: routes + service + schema (+ table) — auth.
- Level 3: domain/repository — только когда появится реальная сложность.

### 4.1. Health (Level 1)

[src/server/modules/health/health.routes.ts](src/server/modules/health/health.routes.ts)

`GET /api/health` → `{ status: "ok" }` через `jsonResponse`. Эталон минимального endpoint с контрактом.

### 4.2. Auth (Level 2) — главный образец

Публичный вход модуля: [src/server/modules/auth/index.ts](src/server/modules/auth/index.ts)  
(другие модули должны импортировать только отсюда, не из `*.service.ts` напрямую).

| Файл | Ответственность |
|------|-----------------|
| [contract/schema.ts](src/server/modules/auth/contract/schema.ts) | Zod-схемы тел и сущностей |
| [contract/endpoints.ts](src/server/modules/auth/contract/endpoints.ts) | Явные контракты endpoint’ов |
| [auth.table.ts](src/server/modules/auth/auth.table.ts) | Таблицы `users`, `refresh_tokens` |
| [auth.cookies.ts](src/server/modules/auth/auth.cookies.ts) | HttpOnly refresh cookie helpers |
| [auth.csrf.ts](src/server/modules/auth/auth.csrf.ts) | Origin/Referer allowlist helpers |
| [auth.implement.ts](src/server/modules/auth/auth.implement.ts) | `implementAuth` — CSRF → contract `403` |
| [auth.service.ts](src/server/modules/auth/auth.service.ts) | Бизнес-логика + атомарные register/refresh |
| [auth.routes.ts](src/server/modules/auth/auth.routes.ts) | `implementAuth` / `implement` + Set-Cookie |

Эндпоинты:

| Method | Path | Где обработчик |
|--------|------|----------------|
| POST | `/api/auth/register` | [auth.routes.ts](src/server/modules/auth/auth.routes.ts) |
| POST | `/api/auth/login` | то же |
| POST | `/api/auth/refresh` | то же (cookie in/out) |
| POST | `/api/auth/logout` | то же (cookie) |
| GET | `/api/auth/me` | то же (Bearer access token) |

Поток register → session:

```text
routes (implement + contract input)
  → service.register
      → hash password
      → insert user (unique → 409)
      → issue access JWT + store sha256(refresh)
  → Set-Cookie: refresh_token (HttpOnly)
  → JSON { accessToken, user }  // без refresh
```

---

## 5. Frontend: упрощённый FSD

### 5.1. Entry и shell

| Файл | Роль |
|------|------|
| [index.html](index.html) | HTML entry для Vite |
| [src/client/main.tsx](src/client/main.tsx) | React root + Router |
| [src/client/app/App.tsx](src/client/app/App.tsx) | Layout, nav, маршруты |
| [src/client/app/styles.css](src/client/app/styles.css) | Базовые стили |
| [vite.config.ts](vite.config.ts) | Vite + proxy `/api` → `:8787` |

### 5.2. Страницы

| Страница | Файл |
|----------|------|
| Home (сессия / logout / refresh) | [src/client/pages/HomePage.tsx](src/client/pages/HomePage.tsx) |
| Login | [src/client/pages/LoginPage.tsx](src/client/pages/LoginPage.tsx) |
| Register | [src/client/pages/RegisterPage.tsx](src/client/pages/RegisterPage.tsx) |

Pages тонкие: UI-состояние форм и вызовы — в `features/auth`.

### 5.3. Feature Auth

| Файл | Роль |
|------|------|
| [AuthProvider.tsx](src/client/features/auth/AuthProvider.tsx) | Контекст: login/register/logout/refresh/me |
| [AuthForm.tsx](src/client/features/auth/AuthForm.tsx) | Общая форма email/password |
| [session.ts](src/client/features/auth/session.ts) | Access JWT только в memory (без localStorage) |

### 5.4. Typed API client

[src/client/shared/api/client.ts](src/client/shared/api/client.ts)

```ts
import { hc } from "hono/client";
import type { AppType } from "../../../server/app";

export const api = hc<AppType>("/", {
  init: { credentials: "include" },
});
```

- Только `import type` `AppType` с сервера — runtime server-код в бандл не попадает.
- `credentials: "include"` нужен для HttpOnly refresh cookie.
- Тип пользователя на клиенте: `InferResponseType<typeof api.api.auth.me.$get, 200>`.

Правила слоёв (pages → features/shared; features ↛ pages; client ↛ server runtime) закреплены в [eslint.config.js](eslint.config.js).

---

## 6. Сквозной сценарий: Login

```text
Browser  LoginPage
   → AuthForm / AuthProvider.login
   → api.api.auth.login.$post (credentials include)
   → Vite proxy /api → Bun :8787
   → implementAuth(loginContract)  // CSRF 403 в контракте

   → auth.service.login
   → Set-Cookie refresh + JSON { accessToken, user }
   → setAccessToken (memory) + setUser
   → navigate HomePage
```

Файлы по цепочке:

1. [LoginPage.tsx](src/client/pages/LoginPage.tsx)
2. [AuthProvider.tsx](src/client/features/auth/AuthProvider.tsx)
3. [client.ts](src/client/shared/api/client.ts)
4. [auth.routes.ts](src/server/modules/auth/auth.routes.ts)
5. [auth/contract/endpoints.ts](src/server/modules/auth/contract/endpoints.ts) (контракт)
6. [auth.service.ts](src/server/modules/auth/auth.service.ts)
7. [lib/contract.ts](src/server/lib/contract.ts) (`implement`)

---

## 7. Quality gates

| Что | Команда | Где смотреть |
|-----|---------|--------------|
| Typecheck | `bun run typecheck` | [tsconfig.server.json](tsconfig.server.json), [tsconfig.client.json](tsconfig.client.json) |
| Lint / границы | `bun run lint` | [eslint.config.js](eslint.config.js) |
| Tests | `bun run test` | [tests/](tests/) |
| Build | `bun run build` | Vite → `dist/client` |

Тесты:

| Файл | Что покрывает |
|------|----------------|
| [tests/setup.ts](tests/setup.ts) | Env для тестовой БД / JWT |
| [tests/auth.service.test.ts](tests/auth.service.test.ts) | register/login, rotation, duplicate email |
| [tests/auth.contract.test.ts](tests/auth.contract.test.ts) | CSRF, cookie session flow, validation |
| [tests/contract.implement.test.ts](tests/contract.implement.test.ts) | Негативные кейсы `implement()` |
| [tests/architecture/eslint-boundaries.test.ts](tests/architecture/eslint-boundaries.test.ts) | Deep import forbidden / index allowed |

Битый response не уходит как success — см. [contract.implement.test.ts](tests/contract.implement.test.ts).

---

## 8. OpenSpec и агенты

| Файл | Роль |
|------|------|
| [openspec/config.yaml](openspec/config.yaml) | Единый OpenSpec в корне (frontend+backend) |
| [AGENTS.md](AGENTS.md) | Краткие правила для coding-агентов |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Целевая архитектура и DoD |

Нет Nest/CQRS/DI/LangGraph — это осознанный отказ, список в §12 [ARCHITECTURE.md](ARCHITECTURE.md).

---

## 9. Как добавлять новую фичу (шпаргалка)

Любой endpoint → contract-first:

1. `modules/<name>/contract/schema.ts` — Zod body/entity
2. `modules/<name>/contract/endpoints.ts` — `input` + `responses` (**сначала это**)
3. `*.service.ts` при наличии логики
4. `*.routes.ts` — `implement(contract, handler)`
5. Подключить в [app.ts](src/server/app.ts)
6. При необходимости UI + [client.ts](src/client/shared/api/client.ts)
7. Тесты: [tests/auth.contract.test.ts](tests/auth.contract.test.ts)

С БД: `*.table.ts` → [db/schema.ts](src/server/db/schema.ts) → `bun run db:generate && bun run db:migrate`.

Перед merge: `typecheck` + `lint` + `test` + `build`.

---

## 10. Быстрый индекс файлов

**Корень:** [package.json](package.json) · [ARCHITECTURE.md](ARCHITECTURE.md) · [AGENTS.md](AGENTS.md) · [README.md](README.md) · [eslint.config.js](eslint.config.js) · [vite.config.ts](vite.config.ts) · [drizzle.config.ts](drizzle.config.ts)

**Server core:** [index.ts](src/server/index.ts) · [app.ts](src/server/app.ts) · [contract.ts](src/server/lib/contract.ts) · [password.ts](src/server/lib/password.ts) · [tokens.ts](src/server/lib/tokens.ts) · [db/index.ts](src/server/db/index.ts)

**Auth module:** [index.ts](src/server/modules/auth/index.ts) · [contract/](src/server/modules/auth/contract/) · [routes](src/server/modules/auth/auth.routes.ts) · [service](src/server/modules/auth/auth.service.ts) · [table](src/server/modules/auth/auth.table.ts)

**Client:** [main.tsx](src/client/main.tsx) · [App.tsx](src/client/app/App.tsx) · [client.ts](src/client/shared/api/client.ts) · [AuthProvider.tsx](src/client/features/auth/AuthProvider.tsx) · [HomePage.tsx](src/client/pages/HomePage.tsx)
