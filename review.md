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
- Битый response → generic `500` (`RESPONSE_VALIDATION`), без утечки payload.

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
| [auth.service.ts](src/server/modules/auth/auth.service.ts) | Бизнес-логика: register/login/refresh/logout/me |
| [auth.routes.ts](src/server/modules/auth/auth.routes.ts) | `implement(contract, …)` + вызов service |

Эндпоинты:

| Method | Path | Где обработчик |
|--------|------|----------------|
| POST | `/api/auth/register` | [auth.routes.ts](src/server/modules/auth/auth.routes.ts) |
| POST | `/api/auth/login` | то же |
| POST | `/api/auth/refresh` | то же |
| POST | `/api/auth/logout` | то же |
| GET | `/api/auth/me` | то же (Bearer access token) |

Поток register → tokens:

```text
routes (zod request)
  → service.register
      → hash password
      → insert user
      → issue access JWT + store hashed refresh
  → jsonResponse(tokenPairSchema)
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
| [session.ts](src/client/features/auth/session.ts) | Хранение access/refresh в memory + `localStorage` |

### 5.4. Typed API client

[src/client/shared/api/client.ts](src/client/shared/api/client.ts)

```ts
import { hc } from "hono/client";
import type { AppType } from "../../../server/app";

export const api = hc<AppType>("/");
```

- Только `import type` с сервера — runtime server-код в бандл не попадает.
- Вызовы вида `api.api.auth.login.$post({ json: ... })` типизированы от серверных роутов.

Правила слоёв (pages → features/shared; features ↛ pages; client ↛ server runtime) закреплены в [eslint.config.js](eslint.config.js).

---

## 6. Сквозной сценарий: Login

```text
Browser  LoginPage
   → AuthForm / AuthProvider.login
   → api.api.auth.login.$post
   → Vite proxy /api → Bun :8787
   → auth.routes (zValidator)
   → auth.service.login
   → jsonResponse(tokenPairSchema)
   → setSession + setUser
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
| [tests/auth.service.test.ts](tests/auth.service.test.ts) | register/login, duplicate email, bad password |
| [tests/auth.contract.test.ts](tests/auth.contract.test.ts) | 400 на bad body, полный auth flow, broken response → 500 |

Важный контрактный кейс: намеренно битый response **не** уходит клиенту как успешный JSON — см. тест `invalid response shape never returns as success payload` в [auth.contract.test.ts](tests/auth.contract.test.ts).

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
