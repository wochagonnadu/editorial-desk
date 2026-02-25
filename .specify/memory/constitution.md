<!--
SYNC IMPACT REPORT
==================
Version change: 1.1.0 → 1.1.1
Bump rationale: PATCH — re-scoped "Forward to reviewer" into web MVP.
PATCH 1.0.2 descoped forward from email-only MVP; web MVP spec (002)
requires it as a web-only manager action (FR-043). No principle
changes, only scope clarification in Amendment Log.

Previous report (1.0.2 → 1.1.0):
MINOR — new principle added (VIII), two existing
principles materially expanded (I, V). No removals or redefinitions.

Modified principles:
  - I. Editorial Framing — expanded with microcopy tone guidelines
    from Web PRD §10 (calm vocabulary do/don't list).
  - V. Email-First Expert Experience → V. Dual-Channel Access —
    renamed and expanded to reflect web app as single source of
    truth for managers alongside email-first expert interaction
    (Web PRD §1).

Added sections:
  - VIII. Calm UX & Minimal Cognitive Load (Web PRD §5)

Removed sections: (none)

Templates requiring updates:
  - .specify/templates/plan-template.md        ✅ no update needed
    (Constitution Check is a dynamic reference)
  - .specify/templates/spec-template.md        ✅ no update needed
    (generic template, no constitution-specific refs)
  - .specify/templates/tasks-template.md       ✅ no update needed
    (generic template, no constitution-specific refs)
  - .specify/templates/checklist-template.md   ✅ no update needed
  - .specify/templates/commands/               ✅ directory does not exist
  - README.md                                  ✅ does not exist yet
  - AGENTS.md                                  ✅ no constitution refs

Follow-up TODOs: (none)
-->

# Virtual Newsroom Constitution

## Core Principles

### I. Editorial Framing (NON-NEGOTIABLE)

The product MUST be positioned as a "virtual newsroom" / "editorial
team." Users MUST perceive an editorial process, not an AI generator.

- UI and marketing MUST NOT use: "generation," "automation,"
  "AI-powered," "generator," "error," "failed" (any language
  equivalent).
- Permitted vocabulary: "editors," "draft," "proofreading,"
  "approval," "editorial plan," "accountability."
- UI microcopy MUST use calm, human tone: "needs clarification"
  (not "error"), "draft ready" (not "generated"), "gentle
  reminder" (not "overdue alert"), "N facts to confirm" (not
  "N claims failed").
- Every user-facing surface MUST reinforce the metaphor of a
  professional editorial office staffed by named roles.

**Rationale**: Research shows SMB experts in high-liability verticals
(medicine, law) reject "AI content" framing. Trust and adoption depend
on the editorial-responsibility narrative. Calm microcopy reinforces
that the product is a professional team, not a machine.

### II. Voice Fidelity

Every piece of content MUST sound like the specific expert it
represents. Voice matching is the primary product differentiator.

- Each expert MUST have a Voice Profile built via the 5-email
  onboarding sequence before any content is produced.
- A mandatory "voice test" draft MUST be approved by the expert
  before the system produces real content.
- Voice score (internal + expert rating) MUST be tracked per draft.
- If the expert rates voice fidelity below threshold, the system
  MUST offer unlimited revisions within the first billing month.

**Rationale**: PRD Tier 1 requirement. Voice mismatch causes immediate
churn (Risk R1). No content ships until the expert confirms "this
sounds like me."

### III. Factual Accuracy & Compliance

All content MUST pass a factchecking pipeline before reaching any
approver. The system MUST NOT publish unchecked claims.

- Claim Extractor MUST identify verifiable claims and assign risk
  levels (low / medium / high).
- High-risk claims MUST be verified by Factcheck Agents; results
  attached as a Factcheck Report.
- Statistics without a cited source MUST be rejected.
- Vertical-specific disclaimers (medical, legal, financial) MUST be
  appended automatically when the expert's domain requires it.
- Experts MAY mark claims as "expert-confirmed," accepting personal
  responsibility; this MUST be logged in the audit trail.
- Dangerous advice and categorical promises MUST be flagged and
  blocked by quality gates.

**Rationale**: Errors in medicine/law destroy trust and create legal
risk. The factcheck pipeline is the product's compliance backbone.

### IV. Immutable Versioning & Audit Trail

Every edit MUST create a new immutable draft version. The system MUST
maintain a tamper-evident audit trail.

- Approval decisions MUST be bound to a specific `draft_version_id`.
- The system MUST store diffs and the identity of who changed what.
- Audit logs MUST be append-only; no record may be deleted or
  modified after creation.
- If a user replies to an outdated email thread, the system MUST
  detect the version mismatch, notify the user of the current
  version, and offer to migrate their comment.

**Rationale**: Regulated industries (healthcare, law) require provable
approval chains. Immutability prevents "who approved what?" disputes.

### V. Dual-Channel Access

Experts interact via email; managers operate via the web app.
The web app is the single source of truth for all content state.

- Experts MUST be able to complete all critical actions via email
  without learning a new interface.
- Onboarding (voice profiling) MUST happen entirely through email.
- Approval actions (Approve / Request Changes) MUST be
  available as one-click buttons in the email body.
- Every email MUST include a magic link to the web document for
  users who prefer a richer UI.
- Magic links MUST have a TTL and MUST be revocable.
- The system MUST prevent accidental approval of outdated versions
  via safe-guard logic in magic link tokens.
- Auto-reminders and escalation MUST be built into the email flow.
- The web app MUST serve as the authoritative dashboard for
  content managers: pipeline statuses, calendar, approvals,
  versions, and audit trail.
- All data surfaced in emails MUST be consistent with the web
  app's canonical state.

**Rationale**: Experts (doctors, lawyers, professors) will not adopt
new software — email is their channel. Content managers need a richer
workspace for planning and oversight. The web app holds canonical
state; email is a synchronized access layer for experts.

### VI. Simplicity & 80/20

Start with the simplest working solution. No unnecessary
abstractions, no premature optimization, no speculative features.

- Target ≤100 lines of code per file; split logically if exceeded.
- Prefer custom code for core product logic; use libraries only
  when they provide real complexity reduction.
- Every new dependency or abstraction layer MUST be justified.
- Features not in the current MVP tier MUST NOT be implemented
  "just in case."
- Monorepo structure: `/apps/web`, `/services/api`,
  `/packages/shared`, `/specs`.

**Rationale**: Small startup with limited resources. Over-engineering
kills velocity. The 80/20 rule maximizes value per line of code.

### VII. Observability & Idempotency

All workflow steps MUST be observable and safely retryable.

- Structured logging MUST be present in every service and agent.
- Every workflow task (agent step) MUST be idempotent — safe to
  retry without side effects.
- Failed steps MUST have compensation logic (rollback or skip).
- Workflow status MUST be visible to the content manager at all
  times (Kanban statuses: Drafting, Factcheck, Needs Review,
  Approved, Revisions).
- Key events (`version_created`, `approval_requested`,
  `approval_granted`, `claim_failed`) MUST be emitted and logged.

**Rationale**: An orchestrated multi-agent pipeline will fail
partially. Without idempotency and observability, debugging and
recovery become impossible at scale.

### VIII. Calm UX & Minimal Cognitive Load

The product MUST feel like a calm, professional editorial office —
not a complex SaaS tool. Every screen minimizes cognitive load.

- "One primary action per screen" MUST be the default design
  pattern. Secondary actions are visually subordinate.
- Progressive disclosure: complexity MUST be hidden until the
  user explicitly requests it (e.g., fact-check details expand
  on click, not shown by default).
- Familiar metaphors MUST be used: cards (Trello/Notion style),
  document view (Google Docs-like), calendar.
- Every content card MUST display: status pill, next reviewer,
  and deadline (if set).
- Default views MUST prioritize "what needs attention now":
  Today / This Week / Needs Your Attention.
- WCAG-compliant spacing, contrast, keyboard navigation, and
  readable font sizes MUST be maintained.
- Motion MUST be subtle and purposeful; decorative animations
  are FORBIDDEN.

**Rationale**: The primary user outcome is "hired a calm editorial
team." Cluttered or complex UI undermines the editorial metaphor
and drives churn among non-technical SMBs. Cognitive ease is what
separates this product from generic SaaS dashboards.

## Security & Compliance Constraints

- The system MUST NOT collect personal medical data of patients.
- All client case references MUST be anonymized.
- Audit logs and version history MUST be append-only and immutable.
- Magic links MUST use unique tokens with TTL and revocation
  capability.
- Role-based access: experts MUST see only their own materials;
  managers see their company's materials; owners see everything
  within their organization.
- Email inbound parsing MUST validate tokens and reject forged or
  expired requests.

## Development Workflow & Quality Gates

- **Constitution Check**: Every feature plan MUST pass a
  constitution compliance gate before Phase 0 research begins,
  and MUST be re-checked after Phase 1 design.
- **Voice gate**: No expert content enters the draft pipeline until
  the expert's Voice Profile is confirmed.
- **Factcheck gate**: No draft proceeds to approval without a
  completed Factcheck Report.
- **Version gate**: Approval actions MUST reference a specific
  `draft_version_id`; stale-version approvals MUST be rejected.
- **Quality scores**: Each draft MUST have a voice score and a
  factual risk score before it reaches an approver.
- **UX gate**: Every user-facing screen MUST be reviewed against
  Principle VIII (Calm UX) before implementation. Screens with
  more than one primary CTA MUST be justified.
- **File discipline**: Files MUST include the 4-line header comment
  (PATH / WHAT / WHY / RELEVANT). Files exceeding 100 LOC MUST be
  split.
- **Commit discipline**: Commit after each task or logical group.
  Explain "why" in commit messages, not just "what."

## Governance

- This constitution supersedes all other development practices and
  guidelines for the Virtual Newsroom project.
- **Amendment procedure**: Any change to this constitution MUST be
  documented with a Sync Impact Report, reviewed by the project
  owner, and versioned according to semver rules:
  - MAJOR: principle removal or backward-incompatible redefinition.
  - MINOR: new principle or materially expanded guidance.
  - PATCH: wording clarifications, typo fixes, non-semantic edits.
- **Compliance review**: All PRs and code reviews MUST verify
  alignment with these principles. Violations MUST be resolved
  before merge.
- **Complexity justification**: Any deviation from Principle VI
  (Simplicity) MUST be recorded in the plan's Complexity Tracking
  table with rationale and rejected alternatives.
- **Runtime guidance**: Use the agent guidance file
  (`.specify/templates/agent-file-template.md`) for technology-
  specific and project-structure guidance that supplements this
  constitution.

### Amendment Log

**PATCH 1.0.1** (2026-02-24): Principle VI — removed `/services/worker` and `/infra` from monorepo structure. Worker replaced by inline processing + Vercel Cron. No `/infra` dir needed for $0 Vercel+Supabase stack. See plan.md Complexity Tracking.

**PATCH 1.0.2** (2026-02-24): Principle V — removed "Forward" from approval actions list. Forward to reviewer descoped from MVP (FR-012); managers configure reviewers via web UI. Avoids mandating unimplemented feature.

**MINOR 1.1.0** (2026-02-25): Per Web PRD (prd_web.md). Added Principle VIII (Calm UX & Minimal Cognitive Load) — UX discipline from PRD §5. Expanded Principle I with microcopy tone guidelines from PRD §10 ("error"→"needs clarification", "generated"→"draft ready"). Renamed Principle V from "Email-First Expert Experience" to "Dual-Channel Access" — reflects web app as single source of truth for managers alongside email-first expert interaction (PRD §1). Added UX gate to Development Workflow.

**PATCH 1.1.1** (2026-02-25): Principle V — re-scoped "Forward to reviewer" into web MVP. PATCH 1.0.2 descoped forward from email-only MVP (FR-012); web MVP spec (002) requires it in the manager's web UI (FR-043). Forward is implemented as a web-only action — managers assign additional reviewers via the Approvals screen. Email-based forward remains descoped.

**Version**: 1.1.1 | **Ratified**: 2026-02-24 | **Last Amended**: 2026-02-25
