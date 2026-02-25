<!--
PATH: /Users/VC/dev/editorial_ai/docs/site.md
WHAT: Prompt-pack для Stitch: дизайн страниц Virtual Newsroom + storyscrolling
WHY: Зафиксировать единый визуальный и UX-направление перед генерацией экранов
RELEVANT: .PRDS/prd_web.md,specs/002-web-mvp-app/spec.md,apps/web/src/App.tsx
-->

# Virtual Newsroom — Stitch Prompt Pack

## Контекст проекта

Этот набор промптов собран под текущий Web MVP Virtual Newsroom.

Цель: сделать интерфейс в стиле **Editorial Minimalism + Virtual Newsroom** с акцентом на команду экспертов, контент-календарь и спокойную, человечную атмосферу.

## Какие страницы нужны

### Обязательные (MVP web app)

1. Home (Newsroom Dashboard)
2. Experts (список экспертов)
3. Expert Profile (детальная страница эксперта)
4. Calendar (week/month)
5. Drafts (реестр материалов)
6. Draft Editor (документ)
7. Approvals
8. Settings (owner-only)
9. Login / Magic Link

### Маркетинговая страница

10. Storyscrolling Landing (скользящие слайды)

### Опционально (есть в кодовой базе как legacy)

11. Topics
12. Audit
13. Reports

---

## MASTER PROMPT (для всех экранов)

```text
Design a modern web product UI for "Virtual Newsroom".
Style direction: Editorial Minimalism + Virtual Newsroom.
Mood: warm, friendly, human teamwork, calm organization.
Visual language: Trello/Notion-like card system, large readable typography, generous whitespace, prominent team avatars.
Color palette: warm beige, terracotta accents, soft gray neutrals, muted green for approved state, muted amber for warnings.
Avoid dark and neon aesthetics. No purple-dominant UI.
Use clear status pills: Drafting, Factcheck, Needs Review, Approved, Revisions.
Every screen must have one clear primary CTA and subtle secondary actions.
Motion must be subtle and purposeful only.

Typography: editorial-modern pairing (for example: "Manrope" for UI + "Newsreader" for headings).
Accessibility: minimum 16px body text, high contrast, obvious focus states, large hit areas.
Copy tone: editorial, human. Avoid words: automation, AI-powered, generator, error, failed.
Prefer words: editors, draft, needs clarification, gentle reminder, facts to confirm.

Design desktop-first and include responsive behavior for tablet/mobile.
Keep components reusable across screens.
```

---

## PROMPT 1 — Storyscrolling Landing (скользящие слайды)

```text
Create a long-form storyscrolling landing page for Virtual Newsroom.
Use 8 full-screen sections with smooth slide-like transitions and scroll snap.
Add a sticky vertical progress rail showing section progress.
Sections:
1) Hero: “Your experts have answers. Your website needs them.”
2) Pain cards: no time, approval chaos, trust issues.
3) Meet the newsroom team: Editor, Fact-checker, Approval manager, Expert (avatar cards).
4) Workflow story: Topic -> Draft -> Factcheck -> Review -> Approved (single article card moving through stages).
5) Email-first experience: realistic approval email preview with buttons.
6) Safety and trust: versioned approvals, fact-check report, audit trail.
7) Pricing anchor: “Less than an agency retainer.”
8) Final CTA form: name, company email, niche, number of experts.
Keep warm editorial visual style, subtle motion only, no flashy effects.
```

## PROMPT 2 — App Shell + Home (Newsroom Dashboard)

```text
Design the authenticated app shell with a persistent left sidebar:
Home, Experts, Calendar, Drafts, Approvals, Settings.
Main Home page should feel like a calm editorial control room.
Include card blocks:
- Today’s Actions (3–5 priority cards)
- In Review (sorted by urgency)
- This Week mini-calendar
- Team Pulse (expert avatars, voice readiness, last response)
- Activity Feed (recent newsroom actions)
Primary CTA: “Open draft” (or “Approve weekly topics” depending on context).
Use warm cards, visible avatars, clear status pills, and empty states with friendly guidance.
```

## PROMPT 3 — Experts List

```text
Design an Experts page with a card grid.
Each card includes: large avatar, name, role, voice readiness %, last response, drafts in progress.
Add lightweight readiness visual (progress bar or ring).
Primary CTA on page: “Add expert”.
Secondary action on each card: “Request 2 minutes”.
Empty state should invite first expert onboarding.
Keep card rhythm and spacing consistent with Home.
```

## PROMPT 4 — Expert Profile

```text
Design a detailed Expert Profile page.
Top card: avatar, name, role, readiness status.
Sections as stacked cards:
- Voice profile summary (tone, do/don’t, disclaimers)
- Source samples
- Onboarding checklist
- Authored drafts
Primary CTA: “Request update from expert”.
Use soft dividers, editorial typography, and human tone.
```

## PROMPT 5 — Calendar (Week/Month)

```text
Design an Editorial Calendar page.
Header with segmented toggle: Week (default) / Month.
Filter bar: Expert, Status, Risk level.
Week view: 7 columns with card items (title, expert, status).
Month view: compact cards/chips in date cells.
Card click affordance should clearly suggest navigation to draft doc.
Primary CTA: “Create draft”.
Keep visual density calm and readable.
```

## PROMPT 6 — Drafts List

```text
Design a Drafts inventory page with searchable sortable table.
Columns: Title, Expert, Status, Risk, Fact-check count, Next reviewer, Last updated.
Top area: search field + primary CTA “Create draft”.
Row action affordance: open doc.
Use editorial minimal table styling with warm neutrals and clear status pills.
Add empty state for first draft creation.
```

## PROMPT 7 — Draft Editor (Doc page)

```text
Design a modern document editor page.
Header: title, status pill, version selector, next reviewer, deadline, primary CTA “Send for approval”.
Main area: clean writing canvas with inline comments.
Right sidebar tabs: Factcheck, Changes, Audit.
Show factcheck claim summaries and risk indicators in friendly readable cards.
Support warning banner for stale version review.
Focus on clarity, trust, and accountability.
```

## PROMPT 8 — Approvals

```text
Design an Approvals page with two modes:
- Stuck items (default, sorted by waiting time)
- By reviewer (grouped lists)
Each item card: draft title, reviewer, waiting time, status.
Actions: “Gentle reminder” and “Forward to reviewer”.
Primary page CTA: “Resolve bottlenecks” visual focus via default stuck mode.
Use warm urgency cues (amber/terracotta), not alarming red-heavy style.
```

## PROMPT 9 — Settings (Owner)

```text
Design an Owner-only Settings page.
Sections: Team management, Billing, Editorial defaults, Notifications.
Keep layout calm and card-based.
Primary CTA: “Save changes”.
Use same visual system and friendly editorial microcopy.
```

## PROMPT 10 — Login / Magic Link

```text
Design a simple login page for Virtual Newsroom.
Fields: email request and magic token verify.
Tone: welcoming editorial workspace, minimal friction.
Include subtle team-themed illustration or avatar cluster.
Primary CTA: “Send link”.
```

---

## Короткий запуск для Stitch

1. Вставь `MASTER PROMPT` как system/base prompt.
2. Генерируй по одному экрану: сначала `PROMPT 1`, потом `PROMPT 2..10`.
3. После каждого экрана проверяй:
   - один главный CTA,
   - warm palette (beige/terracotta/soft gray),
   - видимые аватарки и командный вайб,
   - минимум 16px текст,
   - аккуратная анимация без перегруза.
