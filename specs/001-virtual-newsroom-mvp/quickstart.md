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
- Supabase account (free tier для dev) или локальный PostgreSQL 16
- Email-провайдер с inbound webhook support (Postmark, Resend и т.п.)
- Anthropic API key

## Setup

```bash
# 1. Установить зависимости
pnpm install

# 2. Скопировать .env и заполнить ключи
cp .env.example .env
# Заполнить: DATABASE_URL (Supabase или локальный PG), EMAIL_*, ANTHROPIC_API_KEY

# 3. Применить миграции
pnpm --filter api run db:migrate

# 4. Запустить все сервисы
pnpm dev
```

`pnpm dev` запускает через Turborepo:
- `apps/web` — React SPA на http://localhost:5173
- `services/api` — Hono API на http://localhost:3000
- `services/worker` — pg-boss worker (фоновые задачи)

## Environment Variables

```env
# Database (Supabase managed или локальный PostgreSQL)
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres

# Email (provider-agnostic — заполнить для выбранного провайдера)
EMAIL_PROVIDER=postmark          # postmark | resend | ses
EMAIL_API_KEY=xxx
EMAIL_INBOUND_ADDRESS=reply@inbound.newsroom.dev
EMAIL_WEBHOOK_SECRET=xxx

# LLM (Anthropic)
ANTHROPIC_API_KEY=sk-ant-xxx

# Auth
JWT_SECRET=dev-secret-change-in-prod
MAGIC_LINK_TTL_HOURS=72

# App
APP_URL=http://localhost:5173
API_URL=http://localhost:3000
```

## Project Structure

```
editorial_ai/
├── apps/web/              # React + Vite SPA
├── services/api/          # Hono REST API
├── services/worker/       # pg-boss background worker
├── packages/shared/       # Domain types, schemas
├── infra/                 # Docker, migrations
├── specs/                 # Spec Kit outputs
├── turbo.json             # Turborepo config
├── pnpm-workspace.yaml    # Workspace definition
└── .env.example           # Environment template
```

## Key Commands

```bash
pnpm dev                   # Запустить все сервисы
pnpm build                 # Собрать все пакеты
pnpm test                  # Запустить Vitest во всех пакетах
pnpm lint                  # ESLint + type check
pnpm --filter api test     # Тесты только для API
pnpm --filter web dev      # Только frontend
```

## Development Flow

1. **Типы и схемы** → `packages/shared/src/`
2. **API endpoints** → `services/api/src/routes/`
3. **Background jobs** → `services/worker/src/jobs/`
4. **Agent logic** → `services/worker/src/agents/`
5. **UI pages** → `apps/web/src/pages/`

Shared types импортируются как `@newsroom/shared` из всех пакетов.

## Email Development

Для локальной разработки email:
- Outbound: sandbox-режим выбранного провайдера (не отправляет реальные письма)
- Inbound: ngrok или inbound testing tool провайдера
- Тестирование webhook: `curl -X POST http://localhost:3000/webhooks/email/inbound -d @test-payload.json`
- Email-адаптер выбирается через `EMAIL_PROVIDER` env var

## Database

```bash
# Создать миграцию
pnpm --filter api run db:generate

# Применить миграции
pnpm --filter api run db:migrate

# Drizzle Studio (визуальный просмотр данных)
pnpm --filter api run db:studio
```
