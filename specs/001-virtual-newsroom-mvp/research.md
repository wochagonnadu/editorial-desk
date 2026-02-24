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

**Rationale**: Один язык для frontend + backend = shared types через
`packages/shared`, один toolchain, одна CI-конфигурация. LLM-экосистема в TS
созрела (Vercel AI SDK, OpenRouter SDK). Для команды 1-3 человека один
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
runner с минимальной конфигурацией (один `turbo.json`). Для 3-package монорепо
это оптимальный баланс.

**Alternatives considered**:
- npm workspaces — нет task orchestration, нет кэширования, hoisting проблемы.
- Nx — мощнее, но тяжелее. Generators, плагины, dependency graph visualization.
  Для 4 пакетов — бульдозер для клумбы. Пересмотреть при 10+ пакетах.

---

## 5. Database

**Decision**: PostgreSQL 16 через Supabase (managed)

**Rationale**: Покрывает все потребности без компромиссов. JSONB с GIN-индексами
для гибких полей (Voice Profiles, Factcheck Reports). BRIN-индексы для append-only
audit trail. Immutable versioning — стандартный паттерн (INSERT-only). pg-boss
позволяет использовать Postgres ещё и как очередь задач.

Supabase как хостинг: managed PostgreSQL без операционной нагрузки. Free tier
(500MB, 2 проекта) достаточен для MVP. Supabase MCP даёт агенту прямой доступ
к схеме и данным во время разработки. Мы используем Supabase **только как
managed Postgres** — без Auth, Storage, Realtime и Edge Functions (YAGNI).
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

## 7. Background Processing

**Decision**: Inline processing в API routes + Vercel Cron Jobs. Без очереди.

**Rationale**: Vercel serverless — max 10s (25s со streaming) на free tier.
Long-running worker невозможен. Для MVP-масштаба (5-10 компаний, ~500 drafts/month)
очередь не нужна — все операции выполняются inline:

- LLM-вызовы (draft generation, factcheck) → streaming API routes, каждый шаг
  pipeline — отдельный вызов из фронтенда
- Email отправка → синхронно внутри API handler'а
- Напоминания и дайджесты → Vercel Cron Jobs (2 бесплатных cron job'а)

Pipeline orchestration перемещается на фронтенд: UI последовательно вызывает
шаги (generate → factcheck → send for review). Каждый шаг идемпотентен.

**Alternatives considered**:
- pg-boss — требует long-running процесс. Не работает на Vercel serverless.
- BullMQ — требует Redis + long-running worker. Двойной overkill.
- Inngest — внешний SaaS, vendor lock-in, бесплатный tier ограничен.
- Отдельный worker на Fly.io/Render — добавляет второй хостинг, усложняет ops.

---

## 8. Redis

**Decision**: НЕ нужен для MVP

**Rationale**: Без worker'а и очереди Redis не нужен вообще. Serverless functions
stateless — in-memory кэш не переживает cold start, но при MVP-масштабе это
не проблема. PostgreSQL (Supabase) — единственный stateful компонент.

Итог: **один PostgreSQL** = один backup, один failover, одна точка отказа.

---

## 9. Email Service

**Decision**: Абстрагированный email-провайдер через адаптер (EmailProvider interface)

**Rationale**: Email — ключевая интеграция (Constitution V), но конкретный провайдер
не влияет на архитектуру. Вводим интерфейс `EmailProvider` в `packages/shared`:
`sendEmail()`, `parseInbound()`. Конкретная реализация (Postmark, Resend, SES) —
отдельный адаптер, выбирается перед запуском. Это не over-abstraction, потому что
интерфейс простой (2-3 метода), а замена провайдера — реальный сценарий.

Требования к провайдеру при выборе:
- Inbound email parsing (webhook, не IMAP polling)
- Delivery/open/click tracking через webhooks
- Высокая deliverability для transactional email
- TypeScript SDK или простой REST API

**Candidates** (для выбора перед запуском):
- Postmark — лучшая deliverability, зрелый inbound parsing. ~$15/month.
- Resend — отличная DX, React Email. Inbound менее зрелый. ~$20/month.
- AWS SES — дёшево, но нет inbound parsing (нужен SES→SNS→Lambda pipeline).

---

## 10. Inbound Email Pattern

**Decision**: Webhook + reply-to address routing с embedded tokens (provider-agnostic)

**Rationale**: Каждое исходящее письмо получает уникальный reply-to:
`reply+{token}@inbound.newsroom.com`. Токен кодирует: draft ID, version, expert ID.
Провайдер парсит email и POST'ит JSON на webhook. Система извлекает токен из
адреса, декодирует контекст, определяет действие.

Формат: `reply+d_42_v_3_exp_17@inbound.newsroom.com`

Токен в адресе (не в теле) — выживает форварды, цитирование, манглинг HTML.
Версионный mismatch — сравнение токена с текущей версией в БД.

Webhook handler принимает provider-specific payload через адаптер и преобразует
в internal `InboundEmail` тип. Бизнес-логика работает только с internal типом.

---

## 11. LLM Provider

**Decision**: OpenRouter (бесплатные модели)

**Rationale**: $0 для проверки гипотезы — ключевое требование. OpenRouter даёт
единый API к десяткам моделей, включая бесплатные community endpoints (rate-limited).
Для MVP достаточно: бесплатные модели позволяют проверить UX и pipeline, а
качество voice matching можно улучшить позже при переходе на платные модели.

Стратегия моделей (обе бесплатные через OpenRouter):
- Генерация драфтов: Llama 3.1 70B или Mistral Large (лучшее качество
  среди бесплатных, хороший русский язык)
- Извлечение/классификация: Llama 3.1 8B или Gemma 2 9B (быстрее, дешевле)

Ограничения бесплатного tier'а:
- Rate limits (зависит от модели, обычно ~10-20 RPM)
- Возможные очереди в пиковые часы
- Нет SLA — допустимо для MVP

**Alternatives considered**:
- Anthropic Claude — лучшее качество voice matching, но ~$5-15/month. Переход
  при масштабировании — одна строка в Vercel AI SDK.
- Mistral API (free tier) — хорошее качество, но rate limits строже.
- Google Gemini (AI Studio free) — щедрый лимит, но structured output
  менее предсказуем. Хороший fallback.

---

## 12. LLM Gateway

**Decision**: Vercel AI SDK (`ai` package)

**Rationale**: Unified interface через провайдеров (OpenRouter ↔ Anthropic ↔ OpenAI —
одна строка). Streaming, structured output через Zod (`generateObject`). Тонкий
слой, без agent frameworks и chain abstractions. Swap провайдера без рефакторинга.
OpenRouter подключается через `@openrouter/ai-sdk-provider`.

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

**Decision**: Vercel (free tier)

**Rationale**: Знакомая платформа. Free Hobby tier покрывает MVP полностью:
- `apps/web` → Vercel static hosting (SPA build)
- `services/api` → Vercel Serverless Functions через `@hono/vercel`
- Cron Jobs → 2 бесплатных (напоминания + дайджесты)
- Preview deployments per PR
- Auto-TLS, CDN, zero-config

Ограничения free tier'а:
- Serverless function timeout: 10s (25s со streaming)
- 100 GB-hrs/month compute
- 2 cron jobs (daily minimum interval)
- 100 GB bandwidth/month

При MVP-масштабе (5-10 компаний) — более чем достаточно.

**Alternatives considered**:
- Railway — хороший, но $15-35/month. Не бесплатный.
- Fly.io — DX усложнился, free tier ограничен.
- Render — cold starts на free tier мешают webhook responsiveness.
- AWS — 5-10x operational overhead. Не для гипотезы.

---

## 16. Performance Goals

| Metric | Target | Rationale |
|--------|--------|-----------|
| API response (p95) | ≤500ms reads, ≤1s writes | Dashboard должен быть отзывчивым |
| Draft generation | ≤25s (streaming) | Vercel free tier streaming limit. Progress indicator в UI |
| Email delivery | ≤30s trigger→inbox | Provider SLA typically 1-10s. Отправка inline |
| Page load | ≤2s initial, ≤500ms navigation | SPA с code splitting, Vercel CDN |
| Factcheck per claim | ≤15s per claim | Каждый claim — отдельный API call |
| Email inbound processing | ≤10s receipt→status update | Webhook → parse → DB write (в рамках 10s limit) |

**Примечание**: streaming API routes дают 25s на free tier. Генерация 800-1500 слов
обычно укладывается в 15-20s. Если модель медленнее — показать промежуточный
результат и предложить продолжить.

---

## Summary

| Категория | Решение | Стоимость/мес |
|-----------|---------|---------------|
| Language | TypeScript 5.x / Node.js 20 LTS | — |
| API | Hono (@hono/vercel) | — |
| Frontend | React 19 + Vite | — |
| Monorepo | pnpm + Turborepo (3 пакета) | — |
| Database | PostgreSQL 16 (Supabase managed) | $0 (free tier) |
| ORM | Drizzle | — |
| Queue | Не нужен (inline + Vercel Cron) | $0 |
| Redis | Не нужен | $0 |
| Email | Адаптер (провайдер TBD) | $0 (free tier, e.g. Resend) |
| LLM | OpenRouter (бесплатные модели) | $0 |
| LLM Gateway | Vercel AI SDK | — (OSS) |
| Testing | Vitest | — |
| Deployment | Vercel (free Hobby tier) | $0 |
| **Итого инфраструктура** | | **$0/мес** |

Итоговая архитектура: TypeScript монорепо (2 deployable units: web SPA + API serverless),
один PostgreSQL (Supabase free tier), два внешних сервиса (email-провайдер через
адаптер + OpenRouter бесплатные модели). Минимум движущихся частей, $0/мес.
