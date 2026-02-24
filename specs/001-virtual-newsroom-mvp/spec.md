<!--
PATH: specs/001-virtual-newsroom-mvp/spec.md
WHAT: Feature specification for Virtual Newsroom MVP
WHY: Captures product requirements and acceptance criteria for implementation
RELEVANT: prd.md,specs/001-virtual-newsroom-mvp/checklists/requirements.md
-->

# Feature Specification: Virtual Newsroom MVP

**Feature Branch**: `001-virtual-newsroom-mvp`
**Created**: 2026-02-24
**Status**: Draft
**Input**: User description: "Virtual Newsroom MVP — editorial AI platform for SMBs in high-liability verticals (clinics, law, education, B2B professional services)"

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Expert Voice Onboarding (Priority: P1)

A content manager adds an expert (doctor, lawyer, professor) to the system and launches a voice-profiling sequence. The expert receives 5 emails over ~10 days, each taking 3–5 minutes to answer. After all responses are collected, the system builds a Voice Profile. A "voice test" draft is generated and sent to the expert for approval before any real content is produced.

**Why this priority**: Without a confirmed Voice Profile, no content can be created. This is the entry point for the entire product value chain.

**Independent Test**: Can be fully tested by adding one expert, completing the 5-email sequence, and verifying the voice test draft is generated and approved. Delivers value: the expert's writing style is captured and confirmed.

**Acceptance Scenarios**:

1. **Given** a content manager with a registered company, **When** they add an expert (name, role, email, domain), **Then** the system sends the first voice-profiling email within 1 hour.

2. **Given** an expert who received email 1 (self-description), **When** they reply with 3 descriptive words, audience type, and 3 signature phrases, **Then** the system processes the reply, stores responses, and sends email 2 within 24 hours.

3. **Given** an expert who completed all 5 emails, **When** the system builds their Voice Profile, **Then** a "voice test" draft (~200 words) is generated in the expert's captured style and sent for approval.

4. **Given** an expert reviewing the voice test draft, **When** they approve it, **Then** the Voice Profile status changes to "confirmed" and the expert becomes eligible for real content production.

5. **Given** an expert reviewing the voice test draft, **When** they request changes, **Then** the system regenerates the draft incorporating feedback, and the cycle repeats until approved.

6. **Given** an expert has public texts/social media linked, **When** the Voice Profile is built, **Then** those texts are used as supplementary signal alongside email responses (email responses take priority).

---

### User Story 2 — Draft Lifecycle & Factchecking (Priority: P2)

Once an expert has a confirmed Voice Profile and a topic is assigned, the system creates a draft "in the expert's voice." The draft goes through a factchecking pipeline: claims are extracted, risk-scored, and verified. The result is a draft accompanied by a Factcheck Report showing what is confirmed, what is disputed, and what needs expert judgment.

**Why this priority**: Content creation and factual accuracy are the core product — the reason customers pay. Without this, the "virtual newsroom" delivers nothing.

**Independent Test**: Assign a topic to an onboarded expert, verify a draft is generated in the expert's style, verify the Factcheck Report is attached, and confirm high-risk claims are flagged.

**Acceptance Scenarios**:

1. **Given** a confirmed Voice Profile and an approved topic, **When** the system generates a draft, **Then** the draft reads in the expert's style and includes their typical phrases, tone, and vocabulary.

2. **Given** a generated draft, **When** claims are extracted, **Then** each claim has a type and risk level (low/medium/high).

3. **Given** extracted claims, **When** high-risk claims are checked, **Then** a Factcheck Report is produced with evidence links and verdict (confirmed / disputed / needs expert review).

4. **Given** a draft with statistics, **When** any statistic lacks a cited source, **Then** the system rejects the statistic and flags it for removal or source addition.

5. **Given** a draft in a regulated domain (medical, legal, financial), **When** the draft is finalized, **Then** a domain-appropriate disclaimer is appended automatically.

6. **Given** a completed draft with Factcheck Report, **When** the content manager views the draft, **Then** they see the draft text, a summary, the Factcheck Report, and a voice score.

---

### User Story 3 — Approval Workflow (Priority: P3)

Drafts with completed factchecking enter an approval workflow. The content manager configures who must approve (sequential or parallel routing). Approvers receive email notifications with one-click actions (Approve / Request Changes). The system tracks versions, consolidates feedback from multiple reviewers, and sends auto-reminders to unresponsive approvers.

**Why this priority**: Approval workflow is the coordination engine that replaces manual "chasing experts." It is a Tier 1 requirement and the primary pain point for content managers.

**Independent Test**: Create a draft, configure a 2-step approval route (content manager then expert), send for approval via email, complete the cycle, and verify audit log entries.

**Acceptance Scenarios**:

1. **Given** a content manager configuring approvals, **When** they set up a sequential route (A then B then C), **Then** each approver receives the draft only after the previous one approves.

2. **Given** a content manager configuring approvals, **When** they set up a parallel route, **Then** all approvers receive the draft simultaneously.

3. **Given** an approver receiving an email, **When** they click "Approve," **Then** their decision is recorded against the specific draft version and the next step triggers automatically.

4. **Given** an approver receiving an email, **When** they click "Request Changes," **Then** their feedback is consolidated into a single "Revision Request" task visible to the content manager.

5. **Given** an approver who has not responded within the deadline, **When** the deadline passes, **Then** the system sends an auto-reminder and logs the delay.

6. **Given** a content manager viewing approvals, **When** they check the status board, **Then** they see Kanban statuses (Drafting, Factcheck, Needs Review, Approved, Revisions) for every article.

7. **Given** multiple reviewers providing feedback, **When** all feedback is collected, **Then** the system consolidates changes into a single merged revision request.

---

### User Story 4 — Version Control & Email Safety (Priority: P4)

Every edit to a draft creates a new immutable version. Approvals are always tied to a specific version. If a user replies to an outdated email thread, the system detects the mismatch and redirects them to the current version. All actions are logged in an append-only audit trail.

**Why this priority**: Version integrity prevents "who approved what?" disputes — critical for regulated industries. Email version safety prevents accidental approval of stale content.

**Independent Test**: Create a draft, make 3 edits (v1 then v2 then v3), attempt to approve v1 via old email, and verify the system blocks the stale approval and offers to redirect.

**Acceptance Scenarios**:

1. **Given** a draft at version v1, **When** any edit is made, **Then** a new immutable version v2 is created and the diff is stored.

2. **Given** an approval email for v1, **When** the current version is v3, **Then** the system responds: "The current version is v3" and offers to migrate the comment.

3. **Given** any approval action, **When** the action is processed, **Then** it is bound to a specific draft version and logged in the audit trail.

4. **Given** an audit trail, **When** a compliance officer queries it, **Then** they see: who, when, which version, what action, and any comments — all immutable.

5. **Given** an email with a magic link, **When** the link is opened, **Then** it has a TTL, can be revoked, and leads to the correct version of the document.

---

### User Story 5 — Editorial Calendar & Topic Planning (Priority: P5)
The system suggests editorial topics based on the company's services, FAQs, common myths, and seasonal relevance. Topics are distributed across experts. The content manager receives a weekly email with proposed topics and can approve or request changes.

**Why this priority**: Topic planning drives the content pipeline. Without it, the system waits passively instead of proactively suggesting what to write next. Lower priority because it can be done manually while higher-priority flows are built.

**Independent Test**: Register a company with services and 2 experts, verify the system proposes topic suggestions, and verify the manager can approve/reject via email.

**Acceptance Scenarios**:

1. **Given** a registered company with services and expert profiles, **When** the system generates topic suggestions, **Then** topics are relevant to the company's domain and distributed across available experts.

2. **Given** a content manager, **When** they receive the weekly topics email, **Then** it contains topic cards with assigned experts and Approve / Request Changes buttons.

3. **Given** a content manager approving a topic, **When** the approval is processed, **Then** the topic enters the draft pipeline for the assigned expert.

---

### User Story 6 — Owner Reporting & Audit (Priority: P6)

The business owner receives a monthly digest showing: how many drafts were created, approved, and published; who caused delays; and the overall editorial output. The owner can also see a visible audit trail confirming the editorial process behind every piece of content.

**Why this priority**: Proves ROI and builds trust with the decision-maker. Lower priority because the core editorial workflows must work first.

**Independent Test**: Complete one full content cycle (draft then factcheck then approve), trigger a monthly digest, and verify it contains accurate counts and timeline data.

**Acceptance Scenarios**:

1. **Given** a completed month of editorial activity, **When** the monthly digest is sent to the owner, **Then** it shows: drafts created, approved, pending, and who caused delays.

2. **Given** a business owner viewing the audit screen, **When** they select any piece of content, **Then** they see the full approval chain: who, when, which version, comments.

---

### Edge Cases

- **Expert does not respond to onboarding emails**: After 3 missed emails with reminders, the system notifies the content manager and pauses the sequence. The manager can resume or reassign.

- **Conflicting edits from parallel reviewers**: The system presents conflicts side-by-side and asks the content manager to resolve before creating the merged version.

- **Expert confirms a disputed claim**: The claim is marked "expert-confirmed" with the expert's identity and timestamp logged. A warning banner remains visible on the Factcheck Report.

- **Magic link expires or is revoked**: The user sees a clear error message with instructions to request a new link from the content manager or the system.

- **Reply to outdated email thread**: Covered in User Story 4. The system detects the version mismatch and offers migration.

- **Approval deadline passes with no response**: Auto-reminder is sent. After a configurable number of reminders, the content manager is notified and can escalate or bypass.

## Clarifications

### Session 2026-02-24

- Q: What happens after final approval — terminal state or export step? → A: "Approved" is the terminal state in MVP. The content manager manually copies/exports the final text for publication outside the system.

- Q: Can content managers edit draft text directly in the web UI? → A: No. The web UI is read-only for draft content. Managers can approve, reject, and add comments/feedback — but all text changes go exclusively through AI regeneration. Only the AI edits text. This keeps the web UI simple and consistent with the email-first philosophy.

- Q: Can an expert belong to multiple companies? → A: No. In MVP, an expert belongs to exactly one company (1:1 relationship). If the same person works for two companies, they are registered as two separate expert records with independent Voice Profiles. This keeps the data model simple and avoids cross-company permission complexity.

- Q: What is the default approval deadline before auto-reminders? → A: 48 hours (2 business days). Content managers can override per approval flow, but the system default is 48h. This balances editorial pace with the reality that busy experts (doctors, lawyers) may not respond instantly.

- Q: What content type and length does MVP target? → A: Blog posts / expert articles, 800–1500 words. This is the primary content format — professional long-form content suitable for expert blogs in high-liability verticals. Enough depth to demonstrate expertise, manageable scope for factchecking. Other formats (social posts, Q&A) are deferred to post-MVP.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST support company registration with email-based authentication for owners and content managers.

- **FR-002**: System MUST allow content managers to add experts (name, role, email, domain, optional public text links).

- **FR-003**: System MUST execute a 5-email voice-profiling sequence per expert, with configurable intervals.

- **FR-004**: System MUST build a Voice Profile from email responses (and optionally parsed public texts), with a "draft" to "confirmed" lifecycle.

- **FR-005**: System MUST generate a "voice test" draft for expert approval before producing real content.

- **FR-006**: System MUST generate drafts in the expert's confirmed voice, with a measurable voice score.

- **FR-007**: System MUST extract verifiable claims from drafts and assign risk levels (low / medium / high).

- **FR-008**: System MUST verify high-risk claims and produce a Factcheck Report with evidence and verdicts.

- **FR-009**: System MUST reject statistics without cited sources. System MUST flag and block dangerous advice and categorical promises before any approver sees the draft.

- **FR-010**: System MUST append domain-specific disclaimers (medical, legal, financial) automatically.

- **FR-011**: System MUST support sequential and parallel approval routing, configurable by the content manager.

- **FR-012**: System MUST provide one-click email actions (Approve / Request Changes). Forward to reviewer is deferred to post-MVP — managers add reviewers via the web UI approval configuration instead.

- **FR-013**: System MUST create a new immutable version on every draft edit, with stored diffs.

- **FR-014**: System MUST bind every approval to a specific draft version.

- **FR-015**: System MUST detect replies to outdated email threads and redirect users to the current version.

- **FR-016**: System MUST maintain an append-only, immutable audit trail of all actions.

- **FR-017**: System MUST send auto-reminders to unresponsive approvers and support escalation.

- **FR-018**: System MUST consolidate feedback from multiple reviewers into a single revision request.

- **FR-019**: System MUST generate topic suggestions based on company services, FAQs, myths, and seasonality.

- **FR-020**: System MUST send weekly topic proposals to content managers via email with approve/reject actions.

- **FR-021**: System MUST send monthly digest emails to business owners with editorial output metrics.

- **FR-022**: System MUST use magic links with TTL and revocation for all email-based document access.

- **FR-023**: System MUST enforce role-based access: experts see only their materials, managers see company materials, owners see everything within their organization.

- **FR-024**: System MUST NOT collect personal medical data of patients. All client references MUST be anonymized.

- **FR-025**: System MUST allow experts to mark claims as "expert-confirmed," with full audit logging.

### Key Entities

- **Company**: Organization that subscribes to the service; has owners, managers, experts.

- **Expert**: Subject-matter specialist (doctor, lawyer, etc.) who provides voice and approves content. Belongs to a Company.

- **Voice Profile**: Captured writing style of an expert; built from email responses and optional public texts. Has status (draft / confirmed).

- **Topic**: Proposed content subject; assigned to an expert; approved by a content manager.

- **Draft**: Content piece written in an expert's voice. Has multiple immutable versions.

- **Draft Version**: Immutable snapshot of a draft at a point in time. Diffs stored between versions.

- **Claim**: Verifiable assertion extracted from a draft; has type and risk level.

- **Factcheck Report**: Collection of verification results for claims in a draft version.

- **Approval Flow**: Configured route for draft approval (sequential or parallel); contains approval steps.

- **Approval Decision**: A single approver's action (approve / request changes) bound to a specific draft version.

- **Audit Log**: Immutable, append-only record of all system actions (edits, approvals, reminders, escalations).

- **Notification**: Email sent to a user (onboarding, approval request, reminder, digest); tracked for delivery and response.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An expert completes voice onboarding (5 emails) within 14 calendar days of being added.

- **SC-002**: 80% of experts approve their "voice test" draft within 2 iterations (original + 1 revision).

- **SC-003**: Time from company registration to first approved content piece is under 30 calendar days.

- **SC-004**: Approval cycle time (draft ready to final approval) is under 5 business days for standard routing.

- **SC-005**: Zero high-risk claims reach publication without a Factcheck Report verdict (confirmed or expert-confirmed).

- **SC-006**: Reminder count per approval averages fewer than 3 pings before response.

- **SC-007**: Voice satisfaction score (expert self-rating, 1–10) averages 7 or above across all experts.

- **SC-008**: Content managers report saving at least 50% of time previously spent coordinating approvals.

- **SC-009**: 100% of approval decisions are traceable to a specific draft version in the audit trail.

- **SC-010**: Monthly digest emails are sent within 24 hours of month-end to all business owners.

### Assumptions

- The product targets a single language per company deployment in MVP. Multi-language support is deferred to a later phase.

- Auto-publication is not in scope. Every content piece requires manual final approval before any external use.

- SEO tooling (SERP API, keyword research) is not in scope for MVP.

- Expert onboarding is strictly email-based. No web-based onboarding forms are required in MVP.

- The "virtual newsroom" framing and vocabulary constraints (no "AI" / "generator" language) apply to all user-facing surfaces including emails, web UI, and documentation.
