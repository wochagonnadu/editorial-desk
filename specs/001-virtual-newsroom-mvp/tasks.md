<!--
PATH: specs/001-virtual-newsroom-mvp/tasks.md
WHAT: Implementation task list for Virtual Newsroom MVP
WHY: Executable plan linking design artifacts to code tasks
RELEVANT: specs/001-virtual-newsroom-mvp/plan.md,specs/001-virtual-newsroom-mvp/spec.md,specs/001-virtual-newsroom-mvp/data-model.md,specs/001-virtual-newsroom-mvp/contracts/api.md
-->

# Tasks: Virtual Newsroom MVP

**Input**: Design documents from `/specs/001-virtual-newsroom-mvp/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Optional — included as Phase 9 (Polish). Not requested explicitly.

**Organization**: Tasks grouped by user story. Each story can be implemented and tested independently after Foundational phase.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Exact file paths included in descriptions

## Path Conventions

```text
apps/web/src/           # React 19 SPA
services/api/src/       # Hono API (Vercel Serverless)
  core/                 # Pure business logic (depends only on ports)
  providers/            # Adapters (DB, email, LLM)
  routes/               # Thin HTTP handlers
packages/shared/src/    # Domain types, port interfaces
  types/                # Entity types
  ports/                # EmailPort, ContentPort, DraftStore, ExpertStore
```

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Monorepo init, package scaffolds, dev tooling

- [X] T001 Init pnpm monorepo with `pnpm-workspace.yaml`, Turborepo `turbo.json` (3 packages: `apps/web`, `services/api`, `packages/shared`)
- [X] T002 [P] Scaffold `packages/shared` — tsconfig, package.json, `src/types/` and `src/ports/` dirs, barrel exports
- [X] T003 [P] Scaffold `services/api` — Hono + `@hono/vercel`, tsconfig, Vercel config (`vercel.json`), entry point `api/index.ts`
- [X] T004 [P] Scaffold `apps/web` — React 19 + Vite, tsconfig, basic `App.tsx` shell with router placeholder
- [X] T005 [P] Configure shared tooling — ESLint flat config, Prettier, `.env.example` with all required vars

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T006 [P] [FOUND] Define domain entity types in `packages/shared/src/types/` — Company, User, Expert, VoiceProfile, OnboardingSequence, Topic, Draft, DraftVersion, Claim, FactcheckReport, ApprovalFlow, ApprovalStep, ApprovalDecision, Comment, Notification, AuditLog (one type file per entity group, barrel export)
- [ ] T007 [P] [FOUND] Define port interfaces in `packages/shared/src/ports/` — `EmailPort`, `ContentPort`, `DraftStore`, `ExpertStore` (per webhooks.md and plan.md contracts)
- [ ] T008 [P] [FOUND] Define email internal types in `packages/shared/src/email/` — `InboundEmail`, `DeliveryEvent`, `OpenEvent`, `ClickEvent`, `EmailProvider` interface (per contracts/webhooks.md)
- [ ] T009 [FOUND] Drizzle schema + migration setup in `services/api/src/providers/db/` — `schema.ts` (all 16 entities per data-model.md), `drizzle.config.ts`, connection pool. Run first migration against Supabase
- [ ] T010 [FOUND] Implement DB provider — Drizzle repos implementing `DraftStore` and `ExpertStore` ports in `services/api/src/providers/db/` (basic CRUD: create, findById, list with filters)
- [ ] T011 [P] [FOUND] Auth routes in `services/api/src/routes/auth.ts` — `POST /auth/login` (send magic link), `GET /auth/verify` (validate token, return JWT), implicit company registration: first login for unknown email → create Company + User (owner) with onboarding defaults (FR-001). Auth middleware for protected routes
- [ ] T012 [P] [FOUND] Email provider adapter in `services/api/src/providers/email.ts` — implement `EmailPort` interface with stub/console adapter (real provider TBD). Token generation for reply-to addresses
- [ ] T013 [P] [FOUND] LLM provider adapter in `services/api/src/providers/llm.ts` — implement `ContentPort` via Vercel AI SDK + `@openrouter/ai-sdk-provider`. Wrapper for `streamText()` and `generateObject()`
- [ ] T014 [P] [FOUND] Error handling and audit logging — unified error format (per api.md Error Format), `logAudit()` helper in `services/api/src/core/audit.ts`, AuditLog insert via DB provider
- [ ] T066 [P] [FOUND] Structured logger setup in `services/api/src/providers/logger.ts` — lightweight structured logger (JSON to stdout, compatible with Vercel logs). Context: request_id, company_id, actor. Used across all routes and core modules (Constitution VII). No external dependency — simple wrapper over console with JSON serialization
- [ ] T015 [P] [FOUND] Company route in `services/api/src/routes/companies.ts` — `GET /companies/me` returning current user's company
- [ ] T016 [P] [FOUND] SPA shell in `apps/web/src/` — React Router layout with sidebar nav (Experts, Calendar, Drafts, Approvals, Audit), auth context, API client service (`services/api.ts`)
- [ ] T017 [FOUND] API router assembly in `services/api/src/routes/index.ts` — mount all route groups under `/api/v1`, apply auth middleware, wire providers (poor man's DI)

**Checkpoint**: Foundation ready — user story implementation can now begin

---

## Phase 3: User Story 1 — Expert Voice Onboarding (Priority: P1) 🎯 MVP

**Goal**: Content manager adds expert → 5-email voice profiling → Voice Profile built → voice test draft approved → expert becomes `active`

**Independent Test**: Add one expert, complete 5-email sequence (mock replies), verify voice test draft generated and VP status = confirmed

**Entities**: Expert, VoiceProfile, OnboardingSequence, Notification
**Endpoints**: `POST /experts`, `GET /experts`, `GET /experts/:id`, `GET /experts/:id/onboarding`
**FRs covered**: FR-002, FR-003, FR-004, FR-005, FR-023, SC-007

### Implementation for User Story 1

- [ ] T018 [P] [US1] Expert CRUD routes in `services/api/src/routes/experts.ts` — `POST /experts` (create + trigger onboarding), `GET /experts` (list with ?status filter), `GET /experts/:id` (detail with VP status)
- [ ] T019 [US1] Onboarding route in `services/api/src/routes/experts.ts` — `GET /experts/:id/onboarding` (5-step progress)
- [ ] T020 [US1] Core voice logic in `services/api/src/core/voice.ts` — `buildVoiceProfile(responses)`: aggregate 5 email responses into `profile_data` JSONB. `calculateVoiceScore(profile, text)`: compare draft against profile. `generateVoiceTest(profile)`: create ~200 word test draft
- [ ] T021 [US1] Core onboarding logic in `services/api/src/core/onboarding.ts` — `startOnboarding(expert)`: create 5 OnboardingSequence records, send email 1. `processReply(step, responseData)`: parse response, store, advance to next step. `checkStalled(expert)`: detect 3 missed reminders → notify manager
- [ ] T022 [US1] Onboarding email templates (5 emails) — plain text/HTML templates for each step: 1) self-description, 2) audience & phrases, 3) draft review, 4) Q&A, 5) myths/boundaries. Store as template functions in `services/api/src/core/email-templates/onboarding.ts`
- [ ] T023 [US1] Inbound email processing for onboarding replies in `services/api/src/routes/webhooks.ts` — `POST /webhooks/email/inbound`: parse reply-to token, match to OnboardingSequence step, call `processReply()`, advance sequence
- [ ] T024 [US1] Voice test flow — after step 5 replied: `buildVoiceProfile()` → `generateVoiceTest()` → create Draft + DraftVersion (voice_test type) → send approval email to expert. Expert approves via email → VP status = confirmed, Expert status = active
- [ ] T025 [P] [US1] Expert list page in `apps/web/src/pages/ExpertsPage.tsx` — table/cards with name, role, status, onboarding progress bar, VP status badge
- [ ] T026 [P] [US1] Expert detail page in `apps/web/src/pages/ExpertDetailPage.tsx` — expert info, onboarding step-by-step tracker, VP status, voice test result (if exists)
- [ ] T027 [US1] Add expert form in `apps/web/src/components/AddExpertForm.tsx` — name, role_title, email, domain (select), public_text_urls (optional list). Calls `POST /experts`
- [ ] T065 [US1] Expert voice self-rating in `services/api/src/core/voice.ts` — `recordSelfRating(expert, draft, score)`: expert rates voice fidelity 1–10 via email button/link. If score < 7 (threshold) → offer unlimited revisions. Store rating in DraftVersion metadata. Route: `POST /drafts/:id/voice-rating` in `services/api/src/routes/drafts.ts`. Email template with 1–10 scale buttons in `services/api/src/core/email-templates/rating.ts` (Constitution II, SC-007)

**Checkpoint**: Expert can be added, receives 5 emails, Voice Profile built and confirmed. US1 fully functional.

---

## Phase 4: User Story 2 — Draft Lifecycle & Factchecking (Priority: P2)

**Goal**: Approved topic → draft generated in expert's voice → claims extracted → factcheck report → draft ready for review

**Independent Test**: Assign topic to confirmed expert, verify draft generated with voice_score, factcheck report attached with verdicts, high-risk claims flagged

**Entities**: Topic (basic CRUD), Draft, DraftVersion, Claim, FactcheckReport, Comment
**Endpoints**: `POST /topics` (manual), `GET /topics`, `GET /drafts`, `GET /drafts/:id`, `POST /drafts/:id/generate`, `POST /drafts/:id/factcheck`, `POST /drafts/:id/revise`, `POST /drafts/:id/comments`, `POST /drafts/:id/claims/:claim_id/expert-confirm`, `GET /drafts/:id/versions`
**FRs covered**: FR-006, FR-007, FR-008, FR-009, FR-010, FR-013, FR-025

### Implementation for User Story 2

- [ ] T028 [P] [US2] Topic routes in `services/api/src/routes/topics.ts` — `GET /topics` (list with ?status, ?expert_id), `POST /topics` (manual creation by manager, source_type='manual')
- [ ] T029 [US2] Core drafts logic in `services/api/src/core/drafts.ts` — `createDraft(topic, expert)`: init Draft + first DraftVersion. `createVersion(draft, content)`: immutable version insert with version_number increment and diff. Draft status state machine transitions (drafting → factcheck → needs_review → approved / revisions). All state transitions idempotent — calling same transition twice is safe (Constitution VII). Failed step leaves draft in current status (compensation = skip + retry)
- [ ] T030 [US2] Core factcheck logic in `services/api/src/core/factcheck.ts` — `extractClaims(text)`: LLM call via ContentPort, returns typed claims with risk_level. `verifyHighRiskClaims(claims)`: LLM verification with evidence. `buildReport(draftVersion, claims, verdicts)`: assemble FactcheckReport. `rejectUnSourcedStats(claims)`: FR-009. `addDisclaimer(domain)`: FR-010. `flagDangerousAdvice(claims)`: detect dangerous advice and categorical promises (Constitution III), block draft from proceeding if found — return actionable flags in FactcheckReport
- [ ] T031 [US2] Draft pipeline routes in `services/api/src/routes/drafts.ts` — `POST /drafts/:id/generate` (streaming SSE, creates DraftVersion), `POST /drafts/:id/factcheck` (streaming SSE, extracts claims + verifies), `POST /drafts/:id/revise` (streaming SSE, new version from instructions)
- [ ] T032 [US2] Draft CRUD routes in `services/api/src/routes/drafts.ts` — `GET /drafts` (list with Kanban statuses), `GET /drafts/:id` (detail: current version, factcheck, approval, comments), `GET /drafts/:id/versions` (version history with diffs)
- [ ] T033 [US2] Comment and expert-confirm routes in `services/api/src/routes/drafts.ts` — `POST /drafts/:id/comments` (add comment to current version), `POST /drafts/:id/claims/:claim_id/expert-confirm` (mark claim as expert-confirmed, FR-025, with audit log)
- [ ] T034 [P] [US2] Drafts Kanban page in `apps/web/src/pages/DraftsPage.tsx` — Kanban board with columns: Drafting, Factcheck, Needs Review, Approved, Revisions. Cards show title, expert, voice_score, factcheck status
- [ ] T035 [US2] Draft detail page in `apps/web/src/pages/DraftDetailPage.tsx` — current version text (read-only), summary, voice_score, factcheck report (claims list with verdicts/evidence), comments list, version history, pipeline action buttons (Generate → Factcheck → Send for Review)
- [ ] T036 [US2] Pipeline UI orchestration in `apps/web/src/components/PipelineControls.tsx` — sequential step runner: Generate (streaming progress) → Factcheck (streaming claims) → Ready. Each step calls API, shows progress, handles errors with compensation: failed step → show error + Retry button (safe because all steps are idempotent, Constitution VII). Revise button with instructions textarea. Pipeline state persisted in Draft.status so user can resume after page reload
- [ ] T037 [P] [US2] Topics page in `apps/web/src/pages/TopicsPage.tsx` — topic list with status filter, create topic form (manual), approve/reject buttons for proposed topics

**Checkpoint**: Full draft lifecycle works: create topic → generate draft → factcheck → view report. US2 fully functional.

---

## Phase 5: User Story 3 — Approval Workflow (Priority: P3)

**Goal**: Draft with completed factcheck → configurable approval route → email notifications → one-click actions → auto-reminders → consolidated feedback

**Independent Test**: Create draft, configure 2-step sequential approval, send for review, complete cycle via email clicks, verify audit entries

**Entities**: ApprovalFlow, ApprovalStep, ApprovalDecision
**Endpoints**: `POST /drafts/:id/send-for-review`, `GET /api/cron/daily`
**FRs covered**: FR-011, FR-012, FR-014, FR-017, FR-018

### Implementation for User Story 3

- [ ] T038 [US3] Core approval logic in `services/api/src/core/approval.ts` — `createFlow(draft, config)`: create ApprovalFlow + Steps. `activateNextStep(flow)`: sequential step advancement. `activateAllSteps(flow)`: parallel mode. `recordDecision(step, version, decision)`: version-bound decision with stale check. `consolidateFeedback(flow)`: merge changes_requested into single revision request (FR-018). `checkDeadlines()`: find overdue steps for reminders
- [ ] T039 [US3] Send-for-review route in `services/api/src/routes/drafts.ts` — `POST /drafts/:id/send-for-review`: validate factcheck completed, create ApprovalFlow, send email notifications to first step (sequential) or all (parallel). Draft status → needs_review
- [ ] T040 [US3] Approval email templates in `services/api/src/core/email-templates/approval.ts` — approval request email (draft summary + Approve / Request Changes buttons with magic link tokens), reminder email, consolidated feedback email
- [ ] T041 [US3] Click webhook for approval actions in `services/api/src/routes/webhooks.ts` — `POST /webhooks/email/click`: parse action URL (approve/request_changes), validate token TTL, stale-version check, call `recordDecision()`, advance flow. Send consolidated feedback if all steps done with changes
- [ ] T042 [US3] Daily cron dispatcher in `services/api/src/routes/cron.ts` — `GET /api/cron/daily`: runs all daily/weekly checks in one handler: (1) approval reminders — find overdue ApprovalSteps, send reminders, escalate; (2) weekly topic proposals — if day == Monday, call `suggestTopics()` + send email to managers (US5/T052 logic). Single cron job covers both. Protected by CRON_SECRET
- [ ] T043 [P] [US3] Approval config UI in `apps/web/src/components/ApprovalConfig.tsx` — form to configure approval route: flow_type (sequential/parallel), add steps (select user/expert), set deadline_hours. Used from DraftDetailPage
- [ ] T044 [P] [US3] Approval status display in `apps/web/src/components/ApprovalStatus.tsx` — visual step tracker showing each approver, their status (waiting/pending/approved/changes_requested), deadline countdown. Embedded in DraftDetailPage

**Checkpoint**: Full approval cycle works: send for review → email actions → auto-reminders → consolidated feedback. US3 fully functional.

---

## Phase 6: User Story 4 — Version Control & Email Safety (Priority: P4)

**Goal**: Immutable versioning, stale-version detection in email replies, audit trail queries, magic link access

**Independent Test**: Create draft, make 3 edits, attempt stale approval via old email, verify block + redirect. Query audit trail for full history.

**Entities**: Cross-cutting (DraftVersion, AuditLog, Notification)
**Endpoints**: `GET /audit`, `GET /docs/:draft_id?token=...`
**FRs covered**: FR-013, FR-014, FR-015, FR-016, FR-022

### Implementation for User Story 4

- [ ] T045 [US4] Stale-version detection in inbound webhook — extend `POST /webhooks/email/inbound` processing: compare token version vs current_version. If stale → auto-reply email: "Актуальна версия vN, вот ссылка". Log stale attempt in AuditLog
- [ ] T046 [US4] Audit routes in `services/api/src/routes/audit.ts` — `GET /audit` with filters (?entity_type, ?entity_id, ?limit, ?offset). Paginated, ordered by created_at desc. Role-based: managers see company, owners see everything
- [ ] T047 [US4] Magic link access in `services/api/src/routes/docs.ts` — `GET /docs/:draft_id?token={magic_link_token}`: validate TTL, not revoked, return read-only draft version view. Errors: 401/410/409 per webhooks.md
- [ ] T048 [P] [US4] Version diff display in `apps/web/src/components/VersionDiff.tsx` — show diff between versions (added/removed/changed). Used in DraftDetailPage version history tab
- [ ] T049 [P] [US4] Audit log page in `apps/web/src/pages/AuditPage.tsx` — filterable audit log table: actor, action, entity, version, timestamp. Linked from draft detail (see approval chain for specific content)

**Checkpoint**: Immutable versioning + stale detection + audit trail + magic links. US4 fully functional.

---

## Phase 7: User Story 5 — Editorial Calendar & Topic Planning (Priority: P5)

**Goal**: System suggests topics based on company profile → weekly email proposals → manager approves/rejects

**Independent Test**: Register company with services + 2 experts, verify topic suggestions generated, verify approval via email

**Entities**: Topic (extended with LLM suggestions)
**Endpoints**: `POST /topics/:id/approve`, `POST /topics/:id/reject`
**FRs covered**: FR-019, FR-020

### Implementation for User Story 5

- [ ] T050 [US5] Core topic suggestion logic in `services/api/src/core/topics.ts` — `suggestTopics(company, experts)`: LLM call via ContentPort, generate topic cards based on company domain/services, expert profiles, FAQs, myths, seasonal relevance. Return structured Topic proposals
- [ ] T051 [US5] Topic approve/reject routes in `services/api/src/routes/topics.ts` — `POST /topics/:id/approve` (status → approved, topic enters draft pipeline), `POST /topics/:id/reject` (status → rejected, with reason). Extend existing topics routes
- [ ] T052 [US5] Weekly proposal email template + logic — `sendWeeklyProposals(company)` in `services/api/src/core/topics.ts`: generate proposals, send email to managers. Called from daily cron dispatcher (T042) on Mondays. Template in `services/api/src/core/email-templates/topics.ts`
- [ ] T053 [US5] Topic email webhook processing — extend `POST /webhooks/email/click` to handle topic approve/reject clicks from email buttons
- [ ] T054 [P] [US5] Calendar view in `apps/web/src/pages/CalendarPage.tsx` — editorial calendar showing topics by week/month, assigned experts, status. Simple table/grid view (not full calendar widget)

**Checkpoint**: Topic suggestions + weekly proposals + approve/reject flow. US5 fully functional.

---

## Phase 8: User Story 6 — Owner Reporting & Audit (Priority: P6)

**Goal**: Monthly digest email to owners with editorial metrics + audit visibility

**Independent Test**: Complete one full content cycle, trigger digest, verify accurate counts

**Entities**: Cross-cutting (aggregation queries)
**Endpoints**: `GET /reports/monthly`, `GET /api/cron/digest`
**FRs covered**: FR-021

### Implementation for User Story 6

- [ ] T055 [US6] Core reports logic in `services/api/src/core/reports.ts` — `buildMonthlyReport(company, period)`: aggregate drafts created/approved/pending, avg approval days, delays (who, how long). Query DraftVersion, ApprovalDecision, AuditLog
- [ ] T056 [US6] Reports route in `services/api/src/routes/reports.ts` — `GET /reports/monthly?month=YYYY-MM`: return monthly stats per api.md contract
- [ ] T057 [US6] Cron digest endpoint in `services/api/src/routes/cron.ts` — `GET /api/cron/digest`: find all companies, build reports, send digest emails to owners. Protected by CRON_SECRET. Extend existing cron routes
- [ ] T058 [US6] Digest email template in `services/api/src/core/email-templates/digest.ts` — monthly digest with metrics: drafts created/approved/pending, delays, overall output
- [ ] T059 [P] [US6] Reports page in `apps/web/src/pages/ReportsPage.tsx` — monthly stats dashboard: summary cards (drafts created, approved, pending), avg approval time, delay list. Simple read-only view

**Checkpoint**: Monthly digest + reports endpoint + web view. US6 fully functional.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Testing, security hardening, cleanup

- [ ] T060 [P] Unit tests for core domain logic in `services/api/tests/` — voice score calculation, draft state machine, approval flow transitions, stale-version detection, claim extraction mocks
- [ ] T061 [P] Integration tests for critical API flows in `services/api/tests/` — create expert → onboarding → generate draft → factcheck → approve cycle (3-5 key flows)
- [ ] T062 [P] Security review — validate role-based access (expert/manager/owner per FR-023), magic link TTL + revocation, CRON_SECRET protection, webhook signature verification, no patient data (FR-024)
- [ ] T063 [P] Vercel deployment config — `vercel.json` with function routes, env vars setup, cron schedule config (reminders daily, digest monthly), build pipeline for monorepo
- [ ] T064 Run quickstart.md validation — follow quickstart.md end-to-end on clean checkout, fix any gaps

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **User Stories (Phases 3-8)**: All depend on Foundational phase completion
  - US1 (Phase 3): Can start after Foundational — no story dependencies
  - US2 (Phase 4): Can start after Foundational — no US1 dependency (topics created manually)
  - US3 (Phase 5): Depends on US2 (needs Draft + Factcheck flow for send-for-review)
  - US4 (Phase 6): Can start after Foundational — extends webhook/versioning from US1-US3 but core logic is independent
  - US5 (Phase 7): Can start after US2 (extends Topic entity with LLM suggestions)
  - US6 (Phase 8): Can start after US2 (needs draft data for aggregation)
- **Polish (Phase 9)**: Depends on all desired user stories being complete

### Recommended Execution Order (solo developer)

```
Phase 1 → Phase 2 → Phase 3 (US1) → Phase 4 (US2) → Phase 5 (US3) → Phase 6 (US4) → Phase 7 (US5) → Phase 8 (US6) → Phase 9
```

### Within Each User Story

- DB schemas before core logic
- Core logic before routes
- Routes before frontend pages
- Backend complete before frontend for that story

### Parallel Opportunities

**Phase 1** — T002, T003, T004, T005 all in parallel after T001

**Phase 2** — All [P] tasks (T006-T008, T011-T016) in parallel; then T009 → T010 → T017

**Phase 3** — T018 → T019 (same file), then T020 → T021 → T022 → T023 → T024, frontend T025+T026+T027 in parallel after backend done

**Phase 4** — T028 can start immediately; T029+T030 in parallel, then T031 → T032 → T033 (same file, sequential); frontend T034+T035+T037 in parallel, then T036

**Phase 5** — T038 → T039 → T040 → T041 → T042; frontend T043+T044 in parallel

**Phase 6** — T045+T046+T047 mostly independent; frontend T048+T049 in parallel

**Phase 7-8** — Follow natural order within each

**Phase 9** — All tasks can run in parallel

---

## Parallel Example: Foundational Phase

```bash
# Launch all type definitions together:
Task: T006 "Domain entity types in packages/shared/src/types/"
Task: T007 "Port interfaces in packages/shared/src/ports/"
Task: T008 "Email internal types in packages/shared/src/email/"

# Launch all independent providers/routes together:
Task: T011 "Auth routes in services/api/src/routes/auth.ts"
Task: T012 "Email provider in services/api/src/providers/email.ts"
Task: T013 "LLM provider in services/api/src/providers/llm.ts"
Task: T014 "Audit logging in services/api/src/core/audit.ts"
Task: T015 "Company route in services/api/src/routes/companies.ts"
Task: T016 "SPA shell in apps/web/src/"
```

---

## Implementation Strategy

### MVP First (US1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1 (Expert Voice Onboarding)
4. **STOP and VALIDATE**: Can you add an expert and complete voice onboarding?
5. Deploy to Vercel, demo the flow

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. US1 → Expert onboarding works → Deploy (MVP core!)
3. US2 → Draft generation + factchecking → Deploy (content pipeline!)
4. US3 → Approval workflow → Deploy (coordination engine!)
5. US4 → Version safety + audit → Deploy (compliance!)
6. US5 → Topic planning → Deploy (proactive editorial!)
7. US6 → Owner reporting → Deploy (ROI visibility!)
8. Each story adds value without breaking previous stories

### Solo Developer Timeline Estimate

- Phase 1-2 (Setup + Foundation): ~3-4 days
- Phase 3 (US1): ~3-4 days
- Phase 4 (US2): ~4-5 days
- Phase 5 (US3): ~3 days
- Phase 6 (US4): ~2 days
- Phase 7 (US5): ~2 days
- Phase 8 (US6): ~2 days
- Phase 9 (Polish): ~2-3 days
- **Total: ~21-27 working days**

---

## FR Coverage Matrix

| FR | Description | Tasks |
|----|-------------|-------|
| FR-001 | Company registration, email auth | T011, T015 |
| FR-002 | Add experts | T018 |
| FR-003 | 5-email voice profiling | T021, T022, T023 |
| FR-004 | Build Voice Profile | T020, T024 |
| FR-005 | Voice test draft | T020, T024 |
| FR-006 | Generate in expert's voice | T029, T031 |
| FR-007 | Extract claims with risk | T030, T031 |
| FR-008 | Verify high-risk claims | T030, T031 |
| FR-009 | Reject unsourced stats | T030 |
| FR-010 | Domain disclaimers | T030 |
| FR-011 | Sequential/parallel approval | T038, T039 |
| FR-012 | One-click email actions | T040, T041 |
| FR-013 | Immutable versioning | T029 |
| FR-014 | Version-bound approvals | T038, T041 |
| FR-015 | Stale email detection | T045 |
| FR-016 | Append-only audit | T014, T046 |
| FR-017 | Auto-reminders + escalation | T042 |
| FR-018 | Consolidated feedback | T038 |
| FR-019 | Topic suggestions | T050 |
| FR-020 | Weekly topic proposals | T052, T053 |
| FR-021 | Monthly digest | T055, T057, T058 |
| FR-022 | Magic links with TTL | T012, T047 |
| FR-023 | Role-based access | T011, T062 |
| FR-024 | No patient data | T062 |
| FR-025 | Expert-confirm claims | T033 |

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story
- Each user story independently completable and testable after Foundational
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Email provider is abstracted — real provider plugged in before launch
- LLM models are free tier (OpenRouter) — quality improves with paid models later
- All streaming endpoints must complete within 25s (Vercel free tier limit)
