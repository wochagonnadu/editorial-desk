<!--
PATH: specs/001-virtual-newsroom-mvp/plan.md
WHAT: Implementation plan for Virtual Newsroom MVP
WHY: Technical blueprint linking spec to executable tasks
RELEVANT: specs/001-virtual-newsroom-mvp/spec.md,.specify/memory/constitution.md,prd.md
-->

# Implementation Plan: Virtual Newsroom MVP

**Branch**: `001-virtual-newsroom-mvp` | **Date**: 2026-02-24 | **Spec**: specs/001-virtual-newsroom-mvp/spec.md
**Input**: Feature specification from `/specs/001-virtual-newsroom-mvp/spec.md`

## Summary

Editorial AI platform for SMBs in high-liability verticals (clinics, law, education).
Monorepo with web dashboard and API service (Vercel serverless). Core flows: expert
voice onboarding via email, draft generation with factchecking, multi-step approval
workflow with immutable versioning, and append-only audit trail. Email-first expert
experience; web UI is read-only for draft content (only AI edits text). Pipeline
orchestration on frontend — each step is a separate streaming API call.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20 LTS
**Primary Dependencies**: Hono + @hono/vercel (API), React 19 + Vite (web), Drizzle ORM, Vercel AI SDK + @openrouter/ai-sdk-provider, email-провайдер через адаптер (TBD), pnpm + Turborepo (monorepo)
**Storage**: PostgreSQL 16 (Supabase managed, MCP для dev). No Redis for MVP.
**Testing**: Vitest. Unit tests for domain logic (80%) + integration for critical API flows (20%).
**Target Platform**: Vercel (free Hobby tier) — SPA static hosting + Serverless Functions + 2 Cron Jobs. Supabase (managed Postgres free tier).
**Project Type**: Monorepo web service (API serverless + SPA). No background worker.
**Performance Goals**: API p95 ≤500ms reads / ≤1s writes. Draft generation ≤25s (streaming, Vercel limit). Email delivery ≤30s. Factcheck ≤15s/claim.
**Constraints**: Email-first UX, read-only web UI for drafts, no auto-publication, single language per company, 25s streaming limit (Vercel free tier), 2 cron jobs max
**Scale/Scope**: MVP — 5–10 companies, ~50–100 experts, ~500 drafts/month. Infra cost $0/month.

## Constitution Check (Pre-Phase 0)

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Principle | Status | Notes |
|---|-----------|--------|-------|
| I | Editorial Framing | PASS | All user-facing surfaces use editorial vocabulary. No AI/generator language in UI, emails, docs. |
| II | Voice Fidelity | PASS | 5-email onboarding, voice test gate, voice score per draft. No content without confirmed profile. |
| III | Factual Accuracy & Compliance | PASS | Claim extraction, risk scoring, factcheck reports, disclaimers, expert-confirmed mechanism. |
| IV | Immutable Versioning & Audit Trail | PASS | Every edit = new version. Version-bound approvals. Append-only audit log. Stale-version detection. |
| V | Email-First Expert Experience | PASS | All expert actions via email. Web-doc as optional upgrade via magic link with TTL. |
| VI | Simplicity & 80/20 | PASS | Monorepo per PRD. No premature abstractions. File discipline enforced. |
| VII | Observability & Idempotency | PASS | Structured logging, idempotent workflow tasks, Kanban status visibility. |

**Security & Compliance**: PASS — No patient data. Anonymized references. Append-only audit. Magic links with TTL + revocation. Role-based access (expert/manager/owner).

**Gate Result**: PASS — no violations. Proceeding to Phase 0.

## Constitution Check (Post-Infrastructure Simplification)

*Re-check after dropping worker, switching to Vercel/OpenRouter, $0 target.*

| # | Principle | Status | Notes |
|---|-----------|--------|-------|
| I | Editorial Framing | PASS | Pipeline step endpoints use editorial vocab: "drafts", "generate", "factcheck", "revise", "send-for-review". No forbidden words. |
| II | Voice Fidelity | PASS | VoiceProfile, 5-step onboarding, voice_score — unchanged. OpenRouter models tested for Russian text quality. |
| III | Factual Accuracy & Compliance | PASS | Factcheck as separate streaming step. Claims, risk levels, expert-confirmed — all preserved. Each step idempotent. |
| IV | Immutable Versioning & Audit Trail | PASS | Data model unchanged. DraftVersion + ApprovalDecision + AuditLog: all NO UPDATE/NO DELETE. STALE_VERSION (409) in pipeline steps. |
| V | Email-First Expert Experience | PASS | Email sent inline from API handler (no worker needed). Inbound webhook within 10s serverless limit. Magic links preserved. |
| VI | Simplicity & 80/20 | PASS* | *Simpler than before*: 2 units vs 3, no pg-boss, $0/month. Constitution text mentions `/services/worker` — deviation logged in Complexity Tracking. Amendment recommended. |
| VII | Observability & Idempotency | PASS | Each pipeline step idempotent (safe to retry). AuditLog, Notification tracking, Kanban statuses — all preserved. Cron endpoints for reminders/digests. |

**Security & Compliance**: PASS — unchanged from Post-Phase 1 check.

**Gate Result**: PASS — all 7 principles satisfied. Architecture is strictly simpler. One notation: Constitution VI mentions `/services/worker` directory — needs a PATCH amendment to reflect current architecture.

## Project Structure

### Documentation (this feature)

```text
specs/001-virtual-newsroom-mvp/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
apps/
└── web/                 # SPA dashboard (Experts, Calendar, Drafts, Approvals, Audit)
    ├── src/
    │   ├── components/
    │   ├── pages/
    │   └── services/    # API client, helpers
    └── tests/

services/
└── api/                 # REST API (Vercel Serverless via @hono/vercel)
    ├── src/
    │   ├── core/        # Чистая бизнес-логика (зависит только от портов)
    │   │   ├── voice.ts       # Voice profiling, score calculation
    │   │   ├── drafts.ts      # Draft lifecycle, versioning rules
    │   │   ├── factcheck.ts   # Claim extraction, risk scoring
    │   │   └── approval.ts    # Approval workflow, deadlines
    │   ├── providers/   # Адаптеры внешних сервисов
    │   │   ├── email.ts       # EmailPort implementation
    │   │   ├── llm.ts         # ContentPort implementation (OpenRouter)
    │   │   └── db/            # DraftStore/ExpertStore impl (Drizzle)
    │   └── routes/      # HTTP-хэндлеры (тонкие, вызывают core/)
    ├── api/              # Vercel serverless entry point
    └── tests/

packages/
└── shared/              # Domain types, schemas, port interfaces
    └── src/
        ├── types/       # Domain entities (Draft, Expert, Claim...)
        └── ports/       # Интерфейсы (EmailPort, ContentPort, DraftStore)
```

**Structure Decision**: Pragmatic Ports — бизнес-логика в `core/` зависит только от
интерфейсов (портов) в `packages/shared`. Внешние сервисы (DB, email, LLM) — в
`providers/`. Замена провайдера = новый адаптер, core не трогаем. Не полный hexagonal:
нет DI-контейнера, зависимости передаются аргументами (poor man's DI).

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Constitution VI mentions `/services/worker` but worker was removed | Vercel serverless (10s/25s limit) incompatible with pg-boss long-running process | Keeping worker would require second hosting platform ($15-35/month), contradicts $0 target. Inline processing + Vercel Cron is strictly simpler. Recommend PATCH amendment to constitution. |
