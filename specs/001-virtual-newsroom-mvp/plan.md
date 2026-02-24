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
Monorepo with web dashboard, API service, and background worker. Core flows: expert
voice onboarding via email, draft generation with factchecking, multi-step approval
workflow with immutable versioning, and append-only audit trail. Email-first expert
experience; web UI is read-only for draft content (only AI edits text).

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20 LTS
**Primary Dependencies**: Hono (API), React 19 + Vite (web), Drizzle ORM, pg-boss (queue), Vercel AI SDK, email-провайдер через адаптер (TBD), pnpm + Turborepo (monorepo)
**Storage**: PostgreSQL 16 (Supabase managed, MCP для dev). No Redis for MVP.
**Testing**: Vitest. Unit tests for domain logic (80%) + integration for critical API flows (20%).
**Target Platform**: Linux server (Docker on Railway), Supabase (managed Postgres), web browser (SPA)
**Project Type**: Monorepo web service (API + SPA + background worker)
**Performance Goals**: API p95 ≤500ms reads / ≤1s writes. Draft generation ≤60s. Email delivery ≤30s. Factcheck ≤15s/claim.
**Constraints**: Email-first UX, read-only web UI for drafts, no auto-publication, single language per company
**Scale/Scope**: MVP — 5–10 companies, ~50–100 experts, ~500 drafts/month. Infra cost ~$35-70/month.

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

## Constitution Check (Post-Phase 1 Design)

*Re-check after data model, API contracts, webhooks, and quickstart are written.*

| # | Principle | Status | Notes |
|---|-----------|--------|-------|
| I | Editorial Framing | PASS | API endpoints: "drafts", "approval", "experts", "topics". No forbidden words in contracts or data model. Kanban: Drafting/Factcheck/Needs Review/Approved/Revisions. |
| II | Voice Fidelity | PASS | VoiceProfile 1:1 with Expert, 5-step OnboardingSequence, voice_score on DraftVersion, confirmed status gate in Expert state machine. |
| III | Factual Accuracy & Compliance | PASS | Claim entity with risk_level, FactcheckReport 1:1 with DraftVersion, expert_confirmed verdict, disclaimer_type field, statistics-without-source reject rule. |
| IV | Immutable Versioning & Audit Trail | PASS | DraftVersion + ApprovalDecision + AuditLog: all NO UPDATE/NO DELETE. ApprovalDecision bound to draft_version_id. STALE_VERSION error (409) in API. Stale-version check in webhook processing. |
| V | Email-First Expert Experience | PASS | Inbound webhook with reply-to token routing. Magic link with TTL + revocation in Notification. Click webhook for approve/request_changes. Web-doc as optional upgrade. |
| VI | Simplicity & 80/20 | PASS | Monorepo matches constitution structure. All files have 4-line headers. Single DB, no Redis. No extra dependencies. |
| VII | Observability & Idempotency | PASS | AuditLog with standardized actions. Notification status tracking (queued→delivered→opened→replied). Kanban visible via GET /drafts. Token-based email routing enables safe retries. |

**Security & Compliance**: PASS — No patient data fields. Role-based access. Magic links with TTL + revocation. Append-only audit log. Webhook auth via shared secret.

**Gate Result**: PASS — no violations detected. Phase 1 design artifacts are fully compliant with constitution v1.0.0.

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
    │   └── services/
    └── tests/

services/
├── api/                 # REST API, auth, domain logic
│   ├── src/
│   │   ├── models/
│   │   ├── services/
│   │   └── routes/
│   └── tests/
└── worker/              # Workflow orchestrator + agent executors
    ├── src/
    │   ├── agents/
    │   ├── workflows/
    │   └── jobs/
    └── tests/

packages/
└── shared/              # Domain types, schemas, shared utilities
    └── src/

infra/                   # Docker, migrations, IaC
```

**Structure Decision**: Monorepo with 3 deployable units (web, api, worker) + shared
package, as specified in PRD §13.2 and Constitution Principle VI. Structure follows
`/apps/web`, `/services/api`, `/services/worker`, `/packages/shared`, `/infra`, `/specs`.

## Complexity Tracking

No violations detected. Table intentionally empty.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| (none)    |            |                                     |
