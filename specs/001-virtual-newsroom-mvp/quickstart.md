<!--
PATH: specs/001-virtual-newsroom-mvp/quickstart.md
WHAT: Quick setup guide for local development of Virtual Newsroom MVP
WHY: Enables any developer to get the project running in <15 minutes
RELEVANT: specs/001-virtual-newsroom-mvp/plan.md,specs/001-virtual-newsroom-mvp/research.md
-->

# Quickstart: Virtual Newsroom MVP

## Prerequisites

- Node.js 20 LTS
- pnpm 9+
- Vercel CLI (`npm i -g vercel`)
- Supabase account (free tier для dev) или локальный PostgreSQL 16
- Email-провайдер с inbound webhook support (Postmark, Resend и т.п.)
- OpenRouter API key (бесплатные модели)

## Setup

```bash
# 1. Установить зависимости
pnpm install

# 2. Скопировать .env и заполнить ключи
cp .env.example .env
# Заполнить: DATABASE_URL, DB_SSL_CA_B64, EMAIL_*, OPENROUTER_API_KEY

# 3. Применить миграции
pnpm --filter @newsroom/api run db:migrate

# 4. Запустить все сервисы
pnpm dev
```

`pnpm dev` запускает через Turborepo:
- `apps/web` — React SPA на http://localhost:5173
- `services/api` — Hono API на http://localhost:3000 (через `@hono/node-server` локально)

Для эмуляции Vercel-окружения можно использовать `vercel dev` вместо `pnpm dev`.

## Environment Variables

```env
# Database (Supabase managed или локальный PostgreSQL)
DATABASE_URL=postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?sslmode=verify-full
DB_SSL_CA_B64=base64-encoded-pem-ca-chain

# Email (provider-agnostic — заполнить для выбранного провайдера)
EMAIL_PROVIDER=postmark          # postmark | resend | ses
EMAIL_API_KEY=xxx
EMAIL_FROM=Editorial Desk <no-reply@vsche.ru>
EMAIL_INBOUND_ADDRESS=reply@vsche.ru
EMAIL_WEBHOOK_SECRET=xxx

# LLM (OpenRouter — бесплатные модели)
OPENROUTER_API_KEY=sk-or-v1-xxx

# Auth
JWT_SECRET=dev-secret-change-in-prod
MAGIC_LINK_TTL_HOURS=72

# App
APP_URL=http://localhost:5173
API_URL=http://localhost:3000
```

`DB_SSL_CA_B64` — это base64 от PEM-цепочки CA. Пример генерации:

```bash
base64 -i supabase-ca.pem | tr -d '\n'
```

## Project Structure

```
editorial_ai/
├── apps/web/              # React + Vite SPA
├── services/api/          # Hono REST API (Vercel Serverless)
├── packages/shared/       # Domain types, schemas
├── specs/                 # Spec Kit outputs
├── turbo.json             # Turborepo config
├── pnpm-workspace.yaml    # Workspace definition
├── services/api/vercel.json # Vercel config для API
└── .env.example           # Environment template
```

## Key Commands

```bash
pnpm dev                   # Запустить все сервисы (Turborepo)
pnpm build                 # Собрать все пакеты
pnpm test                  # Запустить Vitest во всех пакетах
pnpm lint                  # ESLint + type check
pnpm --filter @newsroom/api test # Тесты только для API
pnpm --filter @newsroom/web dev  # Только frontend
vercel dev                 # Эмуляция Vercel-окружения (опционально)
```

## Development Flow

1. **Port-интерфейсы** → `packages/shared/src/ports/` (EmailPort, ContentPort, DraftStore)
2. **Domain types** → `packages/shared/src/types/`
3. **Бизнес-логика** → `services/api/src/core/` (чистые функции, зависят только от портов)
4. **Адаптеры** → `services/api/src/providers/` (Drizzle repo, OpenRouter, email)
5. **API endpoints** → `services/api/src/routes/` (тонкие, собирают providers → core)
6. **UI pages** → `apps/web/src/pages/`

Pipeline orchestration живёт на фронтенде: UI последовательно вызывает
шаги (generate → factcheck → send for review). Каждый шаг — отдельный
streaming API call.

Shared types и порты импортируются как `@newsroom/shared` из всех пакетов.

## Email Development

Для локальной разработки email:
- Outbound: sandbox-режим выбранного провайдера (не отправляет реальные письма)
- Inbound: ngrok или inbound testing tool провайдера
- Тестирование webhook: `curl -X POST http://localhost:3000/webhooks/email/inbound -d @test-payload.json`
- Email-адаптер выбирается через `EMAIL_PROVIDER` env var

## Database

```bash
# Создать миграцию
pnpm --filter @newsroom/api run db:generate

# Применить миграции
pnpm --filter @newsroom/api run db:migrate

# Drizzle Studio (визуальный просмотр данных)
pnpm --filter @newsroom/api run db:studio
```

## Vercel Deploy (API)

1. Создай отдельный Vercel project для API и укажи **Root Directory = `services/api`**.
2. Проверь, что `services/api/vercel.json` подхватился (rewrites + 2 cron job).
3. В Project Environment Variables добавь:
   - `DATABASE_URL` (`sslmode=verify-full` для Supabase pooler)
   - `DB_SSL_CA_B64` (base64 PEM CA chain)
   - `EMAIL_PROVIDER`, `EMAIL_API_KEY`, `EMAIL_INBOUND_ADDRESS`, `EMAIL_WEBHOOK_SECRET`
   - `OPENROUTER_API_KEY`
   - `JWT_SECRET`, `MAGIC_LINK_TTL_HOURS`, `CRON_SECRET`
   - `APP_URL`, `API_URL`
4. Для cron-запросов передавай заголовок `Authorization: Bearer ${CRON_SECRET}`.

## Validation Notes (Phase 9)

- `pnpm check` должен проходить без ошибок (typecheck + lint).
- `pnpm test` должен запускать unit/integration suite, включая `services/api/tests`.
- Минимальный smoke перед деплоем:
  1) `GET /health`
  2) `GET /api/cron/daily` без токена -> 401
  3) `POST /api/v1/webhooks/email/inbound` без `x-webhook-secret` -> 401
  4) `GET /api/v1/reports/monthly` под manager JWT -> 403
