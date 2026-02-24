<!--
PATH: specs/001-virtual-newsroom-mvp/research.md
WHAT: Technology research and decisions for Virtual Newsroom MVP
WHY: Documents all tech stack decisions with rationale and rejected alternatives
RELEVANT: specs/001-virtual-newsroom-mvp/plan.md,specs/001-virtual-newsroom-mvp/spec.md,prd.md
-->

# Research: Virtual Newsroom MVP

**Date**: 2026-02-24 | **Branch**: `001-virtual-newsroom-mvp`

Все NEEDS CLARIFICATION из Technical Context разрешены ниже.

---

## 1. Language & Runtime

**Decision**: TypeScript 5.x, Node.js 20 LTS

**Rationale**: Один язык для frontend + backend + worker = shared types через
`packages/shared`, один toolchain, одна CI-конфигурация. LLM-экосистема в TS
созрела (Vercel AI SDK, OpenAI/Anthropic SDK). Для команды 1-3 человека один
язык критичен.

**Alternatives considered**:
- Python — сильнее ML-экосистема, но split-stack (два языка, codegen для типов,
  два пакетных менеджера). LLM вызовы — HTTP API, не тренировка моделей.
- Python worker + TS frontend — гибрид добавляет IPC, сериализацию, два рантайма.
  Оправдан только если нужны Python-only библиотеки. Сейчас не нужны.

---

## 2. API Framework

**Decision**: Hono

**Rationale**: Легковесный (~14KB), встроенная TypeScript type-safety для роутов,
интеграция с Zod через `@hono/zod-validator`. Express-подобный API — кривая
обучения минимальна. Быстрее Express и Fastify в бенчмарках (хотя при MVP-масштабе
это не важно).

**Alternatives considered**:
- Fastify — солидный выбор, JSON Schema валидация. Тяжелее Hono, больше
  boilerplate. Был бы вторым выбором.
- Express — устарел, нет нативного TS, async ошибки через костыли.
- NestJS — DI, декораторы, модули. Массивный overengineering для стартапа.
  Нарушает KISS и YAGNI.

---

## 3. Frontend

**Decision**: React 19 + Vite

**Rationale**: Внутренний SPA-дашборд, SSR не нужен, SEO не нужен. React —
наибольшая экосистема компонентов (Kanban-доски, просмотрщики документов).
Vite — instant dev server. Простейшая архитектура для задачи.

**Alternatives considered**:
- Next.js — SSR, серверные компоненты, API routes. Ничего из этого не нужно для
  внутреннего дашборда. API живёт в `/services/api`. Добавляет сложность без пользы.
- Vue + Vite — технически равноценен, но меньше ecosystem для готовых компонентов
  (Kanban, document viewer), меньше hiring pool.

---

## 4. Monorepo Tooling

**Decision**: pnpm workspaces + Turborepo

**Rationale**: pnpm — strict dependency isolation (нет phantom deps),
content-addressable store (быстрые инсталлы). Turborepo — кэшированный task
runner с минимальной конфигурацией (один `turbo.json`). Для 4-package монорепо
это оптимальный баланс.

**Alternatives considered**:
- npm workspaces — нет task orchestration, нет кэширования, hoisting проблемы.
- Nx — мощнее, но тяжелее. Generators, плагины, dependency graph visualization.
  Для 4 пакетов — бульдозер для клумбы. Пересмотреть при 10+ пакетах.

---

## 5. Database

**Decision**: PostgreSQL 16

**Rationale**: Покрывает все потребности без компромиссов. JSONB с GIN-индексами
для гибких полей (Voice Profiles, Factcheck Reports). BRIN-индексы для append-only
audit trail. Immutable versioning — стандартный паттерн (INSERT-only). pg-boss
позволяет использовать Postgres ещё и как очередь задач.

**Alternatives considered**:
- MySQL — нет нативного JSONB с индексами, нет BRIN. Функционально слабее.
- SQLite — нет concurrent writes, нет LISTEN/NOTIFY. Миграция на Postgres
  неизбежна — лучше сразу.
- MongoDB — audit trail и versioning требуют реляционных связей. $lookup/aggregation
  сложнее SQL JOIN. Транзакции тяжелее. Для структурированных данных Postgres проще.

---

## 6. ORM

**Decision**: Drizzle ORM

**Rationale**: Schema-as-code в TypeScript, полная type-safety до результата
SELECT. Генерирует чистый SQL — контроль над immutable versioning и append-only
паттернами. Миграции через `drizzle-kit`. Минимальный runtime (~7KB).

**Alternatives considered**:
- Prisma — свой DSL, тяжёлый query engine (Rust binary ~15MB), JSONB-поддержка
  слабее. Для INSERT-only паттернов начнёт мешать.
- Kysely — отличный query builder, но нет встроенных миграций, типы описываются
  вручную. Дополнительная нагрузка для маленькой команды.
- Raw pg — никакой type safety, SQL-строки без проверки. При 50+ таблицах слишком
  много boilerplate.

---

## 7. Queue / Workflow Orchestration

**Decision**: pg-boss (PostgreSQL-native queue)

**Rationale**: Job queue поверх PostgreSQL (SKIP LOCKED). Из коробки: ретраи с
backoff, идемпотентные задачи по ключу, дедлайны, отложенный запуск, приоритеты.
Не требует отдельной инфраструктуры. Статусы задач — обычный SELECT.
Workflow DAG реализуется паттерном «completion handler создаёт следующие задачи».

**Alternatives considered**:
- BullMQ — требует Redis (лишний компонент). Данные о задачах в Redis (volatile),
  бизнес-данные в Postgres — рассинхрон.
- Temporal — отдельный сервер, тяжёлый SDK, серьёзный learning curve. Для 500
  drafts/month — артиллерия по воробьям.
- Inngest — внешний SaaS, vendor lock-in, данные уходят наружу.
- Cron + DB polling — нет ретраев, конкурентность руками. pg-boss делает то же,
  но правильно.

---

## 8. Redis

**Decision**: НЕ нужен для MVP

**Rationale**: PostgreSQL закрывает и очередь (pg-boss), и кэширование (in-memory
LRU через `lru-cache`). При одном инстансе приложения и 5-10 компаниях — достаточно.
LISTEN/NOTIFY для базового pub/sub. Пересмотреть при: нескольких инстансах,
real-time collaboration, >10K jobs/hour.

Итог: **один PostgreSQL** = один backup, один failover, одна точка отказа.

---

## 9. Email Service

**Decision**: Postmark (outbound + inbound)

**Rationale**: Лучшая deliverability (~99%) — только transactional email, IP-пулы
не загрязнены спамерами. Inbound parsing — first-class фича, не afterthought.
Структурированный JSON webhook. `StrippedTextReply` убирает quoted text.
TypeScript SDK чистый. ~$15/month при MVP-масштабе.

**Alternatives considered**:
- Resend — отличная DX, но inbound parsing незрелый. Dealbreaker для email-first
  продукта.
- SendGrid — deliverability деградировала. SDK bloated. Overkill.
- AWS SES — дёшево, но нет inbound parsing. Нужен SES→SNS→Lambda→S3 pipeline +
  MIME parsing руками. Огромный DIY overhead.

---

## 10. Inbound Email Pattern

**Decision**: Postmark webhook + reply-to address routing с embedded tokens

**Rationale**: Каждое исходящее письмо получает уникальный reply-to:
`reply+{token}@inbound.newsroom.com`. Токен кодирует: draft ID, version, expert ID.
Postmark парсит email и POST'ит JSON на webhook. Система извлекает токен из
адреса, декодирует контекст, определяет действие.

Формат: `reply+d_42_v_3_exp_17@inbound.newsroom.com`

Токен в адресе (не в теле) — выживает форварды, цитирование, манглинг HTML.
Версионный mismatch — сравнение токена с текущей версией в БД.

---

## 11. LLM Provider

**Decision**: Anthropic Claude (Sonnet для генерации, Haiku для извлечения)

**Rationale**: Claude лучше справляется с voice matching в длинных текстах и
следованием сложным structured output инструкциям. Двухуровневая стратегия:
Sonnet для генерации (~$3/M input), Haiku для классификации (~$0.80/M input).
Ориентировочно ~$5-15/month при MVP-масштабе.

**Alternatives considered**:
- OpenAI GPT-4o — качество близкое, функции вызова зрелые. Хороший fallback.
  Дельта небольшая, поэтому gateway pattern важен для свободной замены.
- Open-source (Llama, Mistral) — hosting стоит дороже API при MVP-масштабе.
  Voice matching значительно хуже. Self-hosted ML инфра — антитеза 80/20.

---

## 12. LLM Gateway

**Decision**: Vercel AI SDK (`ai` package)

**Rationale**: Unified interface через провайдеров (Anthropic ↔ OpenAI — одна
строка). Streaming, structured output через Zod (`generateObject`). Тонкий слой,
без agent frameworks и chain abstractions. Swap провайдера без рефакторинга.

Маппинг задач:
- `streamText()` → генерация драфтов, revision merge
- `generateObject()` → claim extraction, voice profile, fact scoring,
  email classification, topic suggestions

**Alternatives considered**:
- LangChain — ~50+ пакетов, глубокие абстракции. 90% irrelevant. YAGNI.
- Custom wrapper — пришлось бы реализовать streaming, structured output parsing,
  error handling, retry logic. AI SDK уже делает это в ~5KB.
- Direct SDK — lock-in к одному провайдеру. AI SDK даёт optionality бесплатно.

---

## 13. Testing

**Decision**: Vitest

**Rationale**: Vite transform pipeline — TypeScript из коробки без конфигурации.
Нативная ESM поддержка. Встроенный workspace support для монорепо. Jest-совместимый
API. `happy-dom` вместо `jsdom` (2-3x быстрее) для React-компонентов.

**Alternatives considered**:
- Jest — нужен `ts-jest` или `@swc/jest`, ESM experimental. Монорепо support
  хрупкий. Нет технического преимущества для greenfield.
- Node test runner — созревает, но нет workspace orchestration, нет snapshot
  testing, нет coverage без внешних инструментов.

---

## 14. Testing Strategy

**Decision**: Unit tests для domain logic (80%) + integration для критических
API flows (20%). E2E и contract тесты — skip.

Что тестировать:
- Claim extraction, voice score, version state machine, approval flow transitions
- Stale-version detection, draft status transitions
- 3-5 critical API endpoints (create draft → factcheck → approve cycle)

Правило: если баг нарушит Constitution principle или потеряет клиента — пишем тест.
UI layout и email formatting — ручной QA при 5-10 клиентах.

---

## 15. Deployment

**Decision**: Railway

**Rationale**: Монорепо → 3 сервиса в одном проекте, каждый со своим Dockerfile.
Managed PostgreSQL ($1/GB). Private networking. Auto-TLS. Preview environments
per PR. Ориентировочно $20-40/month.

**Alternatives considered**:
- Fly.io — отличный, но DX усложнился (fly.toml per service, volume management).
  Managed Postgres нестабилен. Больше «infrastructure-aware».
- Render — близок к Railway. Cold starts на free tier мешают webhook
  responsiveness. Worker support менее гибкий.
- AWS — VPC, security groups, IAM, ALB. 5-10x operational overhead при том же
  результате. Правильный выбор при 100+ клиентах.

---

## 16. Performance Goals

| Metric | Target | Rationale |
|--------|--------|-----------|
| API response (p95) | ≤500ms reads, ≤1s writes | Dashboard должен быть отзывчивым |
| Draft generation | ≤60s total | LLM 10-30s + post-processing. Progress indicator в UI |
| Email delivery | ≤30s trigger→inbox | Postmark SLA 1-5s. System enqueue ≤2s |
| Page load | ≤2s initial, ≤500ms navigation | SPA с code splitting |
| Factcheck per claim | ≤15s per claim, ≤3min per article | Параллельная проверка claims |
| Email inbound processing | ≤10s receipt→status update | Webhook → parse → DB write |

---

## Summary

| Категория | Решение | Стоимость/мес |
|-----------|---------|---------------|
| Language | TypeScript 5.x / Node.js 20 LTS | — |
| API | Hono | — |
| Frontend | React 19 + Vite | — |
| Monorepo | pnpm + Turborepo | — |
| Database | PostgreSQL 16 | ~$5 (Railway) |
| ORM | Drizzle | — |
| Queue | pg-boss | — (в Postgres) |
| Redis | Не нужен | $0 |
| Email | Postmark | ~$15 |
| LLM | Anthropic Claude (Sonnet + Haiku) | ~$5-15 |
| LLM Gateway | Vercel AI SDK | — (OSS) |
| Testing | Vitest | — |
| Deployment | Railway | ~$20-40 |
| **Итого инфраструктура** | | **~$45-75/мес** |

Итоговая архитектура: TypeScript монорепо, один PostgreSQL, два внешних сервиса
(Postmark + Anthropic). Минимум движущихся частей.
