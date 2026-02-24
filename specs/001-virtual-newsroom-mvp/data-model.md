<!--
PATH: specs/001-virtual-newsroom-mvp/data-model.md
WHAT: Domain entities, relationships, state machines for Virtual Newsroom MVP
WHY: Single source of truth for DB schema and domain logic before coding
RELEVANT: specs/001-virtual-newsroom-mvp/spec.md,specs/001-virtual-newsroom-mvp/research.md,specs/001-virtual-newsroom-mvp/plan.md
-->

# Data Model: Virtual Newsroom MVP

**Date**: 2026-02-24 | **DB**: PostgreSQL 16 | **ORM**: Drizzle

---

## Entity Relationship Diagram (text)

```
Company 1──* User (owner/manager)
Company 1──* Expert
Expert  1──1 VoiceProfile
Expert  1──* OnboardingSequence (email steps)
Expert  1──* Draft (via Topic)
Company 1──* Topic
Topic   1──1 Draft
Draft   1──* DraftVersion
DraftVersion 1──* Claim
DraftVersion 1──0..1 FactcheckReport
Draft   1──1 ApprovalFlow
ApprovalFlow 1──* ApprovalStep
ApprovalStep 1──* ApprovalDecision
DraftVersion 1──* Comment
* ──* AuditLog (polymorphic, append-only)
* ──* Notification (email tracking)
```

---

## Entities

### Company

Организация-клиент. Точка входа для multi-tenancy.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | uuid | PK, default gen | |
| name | varchar(255) | NOT NULL | |
| domain | varchar(100) | NOT NULL | Вертикаль: medical, legal, education, business |
| language | varchar(10) | NOT NULL, default 'ru' | Один язык на компанию в MVP |
| created_at | timestamptz | NOT NULL, default now() | |
| updated_at | timestamptz | NOT NULL | |

---

### User

Владелец или контент-менеджер. Авторизация через email.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | uuid | PK | |
| company_id | uuid | FK → Company, NOT NULL | |
| email | varchar(255) | UNIQUE, NOT NULL | |
| name | varchar(255) | NOT NULL | |
| role | varchar(20) | NOT NULL | `owner` или `manager` |
| created_at | timestamptz | NOT NULL | |

**Validation**: email format, role in ('owner', 'manager').

---

### Expert

Предметный эксперт. Принадлежит ровно одной компании (clarification Q3).

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | uuid | PK | |
| company_id | uuid | FK → Company, NOT NULL | |
| name | varchar(255) | NOT NULL | |
| role_title | varchar(255) | NOT NULL | «Кардиолог», «Адвокат по семейному праву» |
| email | varchar(255) | NOT NULL | Уникален в рамках компании |
| domain | varchar(100) | NOT NULL | medical, legal, education, business |
| public_text_urls | jsonb | default '[]' | Ссылки на публичные тексты/соцсети |
| status | varchar(20) | NOT NULL, default 'pending' | См. state machine ниже |
| created_at | timestamptz | NOT NULL | |

**Unique**: (company_id, email)

**State machine**:
```
pending → onboarding → voice_testing → active → inactive
                                  ↗ (revision loop)
```
- `pending` — добавлен, onboarding не начат
- `onboarding` — email-последовательность идёт
- `voice_testing` — voice test draft отправлен на approval
- `active` — Voice Profile подтверждён, доступен для контента
- `inactive` — деактивирован менеджером

---

### VoiceProfile

Захваченный стиль эксперта. Один на эксперта.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | uuid | PK | |
| expert_id | uuid | FK → Expert, UNIQUE, NOT NULL | 1:1 |
| status | varchar(20) | NOT NULL, default 'draft' | `draft` → `confirmed` |
| profile_data | jsonb | NOT NULL | Структурированные данные из email-ответов |
| public_texts_data | jsonb | default '{}' | Парсенные публичные тексты |
| voice_test_feedback | jsonb | default '[]' | История фидбэка по voice test |
| confirmed_at | timestamptz | NULL | Когда эксперт подтвердил |
| created_at | timestamptz | NOT NULL | |
| updated_at | timestamptz | NOT NULL | |

**profile_data schema** (JSONB):
```json
{
  "descriptive_words": ["string", "string", "string"],
  "audience_type": "string",
  "signature_phrases": ["string", "string", "string"],
  "draft_corrections": "string",
  "qa_responses": [{"question": "string", "answer": "string"}],
  "myths_corrections": [{"myth": "string", "correction": "string"}],
  "boundaries": {
    "never_promise": ["string"],
    "urgent_referral_triggers": ["string"],
    "required_disclaimers": ["string"]
  }
}
```

---

### OnboardingSequence

Трекинг 5-email последовательности для конкретного эксперта.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | uuid | PK | |
| expert_id | uuid | FK → Expert, NOT NULL | |
| step_number | int | NOT NULL, CHECK 1-5 | Номер письма (1-5) |
| status | varchar(20) | NOT NULL, default 'pending' | pending, sent, replied, skipped |
| sent_at | timestamptz | NULL | |
| replied_at | timestamptz | NULL | |
| response_data | jsonb | NULL | Парсенный ответ эксперта |
| reminder_count | int | NOT NULL, default 0 | Сколько напоминаний отправлено |
| created_at | timestamptz | NOT NULL | |

**Unique**: (expert_id, step_number)

**Edge case**: После 3 пропущенных напоминаний — уведомить менеджера, пауза.

---

### Topic

Предложенная тема для контента.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | uuid | PK | |
| company_id | uuid | FK → Company, NOT NULL | |
| expert_id | uuid | FK → Expert, NULL | Назначенный эксперт (NULL если не распределён) |
| title | varchar(500) | NOT NULL | |
| description | text | NULL | |
| source_type | varchar(50) | NOT NULL | faq, myth, seasonal, service, manual |
| status | varchar(20) | NOT NULL, default 'proposed' | |
| proposed_by | varchar(20) | NOT NULL, default 'system' | system или manager |
| created_at | timestamptz | NOT NULL | |

**State machine**:
```
proposed → approved → in_progress → completed
proposed → rejected
```

---

### Draft

Контент-единица. Один драфт на тему.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | uuid | PK | |
| topic_id | uuid | FK → Topic, UNIQUE, NOT NULL | 1:1 с Topic |
| expert_id | uuid | FK → Expert, NOT NULL | |
| company_id | uuid | FK → Company, NOT NULL | Денормализация для быстрого доступа |
| current_version_id | uuid | FK → DraftVersion, NULL | Текущая версия |
| status | varchar(20) | NOT NULL, default 'drafting' | |
| created_at | timestamptz | NOT NULL | |
| updated_at | timestamptz | NOT NULL | |

**State machine** (Kanban statuses):
```
drafting → factcheck → needs_review → approved
                                   → revisions → drafting
```
- `drafting` — генерация/регенерация черновика
- `factcheck` — factcheck pipeline работает
- `needs_review` — ожидает approval
- `approved` — терминальное состояние (clarification Q1)
- `revisions` — получены правки, нужна регенерация

---

### DraftVersion

Иммутабельный снимок драфта. Каждая правка = новая версия (Constitution IV).

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | uuid | PK | |
| draft_id | uuid | FK → Draft, NOT NULL | |
| version_number | int | NOT NULL | Автоинкремент в рамках draft |
| content | text | NOT NULL | Полный текст (800-1500 слов, clarification Q5) |
| summary | text | NULL | Краткое содержание |
| voice_score | decimal(3,2) | NULL | 0.00-1.00 |
| diff_from_previous | jsonb | NULL | Diff от предыдущей версии |
| created_by | varchar(20) | NOT NULL | 'system' или 'revision' |
| created_at | timestamptz | NOT NULL | |

**Unique**: (draft_id, version_number)

**Immutability**: NO UPDATE, NO DELETE. Только INSERT.

---

### Claim

Проверяемое утверждение из драфта.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | uuid | PK | |
| draft_version_id | uuid | FK → DraftVersion, NOT NULL | |
| text | text | NOT NULL | Текст утверждения |
| claim_type | varchar(50) | NOT NULL | statistic, medical, legal, factual, opinion |
| risk_level | varchar(10) | NOT NULL | low, medium, high |
| position_start | int | NULL | Позиция в тексте |
| position_end | int | NULL | |
| created_at | timestamptz | NOT NULL | |

---

### FactcheckReport

Результат проверки claims для конкретной версии.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | uuid | PK | |
| draft_version_id | uuid | FK → DraftVersion, UNIQUE, NOT NULL | 1:1 |
| status | varchar(20) | NOT NULL | pending, completed, failed |
| results | jsonb | NOT NULL, default '[]' | Массив результатов по claims |
| overall_risk_score | decimal(3,2) | NULL | Агрегированный risk score |
| disclaimer_type | varchar(50) | NULL | medical, legal, financial, none |
| completed_at | timestamptz | NULL | |
| created_at | timestamptz | NOT NULL | |

**results schema** (JSONB):
```json
[{
  "claim_id": "uuid",
  "verdict": "confirmed | disputed | needs_expert_review | expert_confirmed",
  "evidence": [{"source": "url", "snippet": "text", "relevance": 0.9}],
  "expert_confirmed_by": "uuid | null",
  "expert_confirmed_at": "timestamptz | null",
  "notes": "string"
}]
```

---

### ApprovalFlow

Настроенный маршрут согласования для драфта.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | uuid | PK | |
| draft_id | uuid | FK → Draft, UNIQUE, NOT NULL | 1:1 |
| flow_type | varchar(20) | NOT NULL | sequential, parallel |
| status | varchar(20) | NOT NULL, default 'pending' | pending, active, completed, cancelled |
| deadline_hours | int | NOT NULL, default 48 | Clarification Q4: 48h default |
| created_by | uuid | FK → User, NOT NULL | Менеджер, настроивший маршрут |
| created_at | timestamptz | NOT NULL | |

---

### ApprovalStep

Шаг в маршруте согласования (один approver).

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | uuid | PK | |
| approval_flow_id | uuid | FK → ApprovalFlow, NOT NULL | |
| step_order | int | NOT NULL | Порядок (для sequential) |
| approver_type | varchar(20) | NOT NULL | user, expert |
| approver_id | uuid | NOT NULL | FK → User или Expert (по approver_type) |
| status | varchar(20) | NOT NULL, default 'waiting' | waiting, pending, approved, changes_requested |
| deadline_at | timestamptz | NULL | Вычисляется при активации шага |
| reminder_count | int | NOT NULL, default 0 | |
| created_at | timestamptz | NOT NULL | |

**State machine**:
```
waiting → pending → approved
                  → changes_requested
```
- `waiting` — ещё не этот шаг (sequential) или flow не запущен
- `pending` — ожидает решения approver'а
- `approved` / `changes_requested` — терминальные для шага

---

### ApprovalDecision

Конкретное решение approver'а, привязанное к версии (Constitution IV).

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | uuid | PK | |
| approval_step_id | uuid | FK → ApprovalStep, NOT NULL | |
| draft_version_id | uuid | FK → DraftVersion, NOT NULL | Привязка к версии! |
| decision | varchar(20) | NOT NULL | approved, changes_requested |
| comment | text | NULL | Текст фидбэка |
| created_at | timestamptz | NOT NULL | |

**Immutability**: NO UPDATE, NO DELETE. Каждое решение — отдельная запись.

---

### Comment

Комментарий к версии драфта (от менеджера или approver'а).

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | uuid | PK | |
| draft_version_id | uuid | FK → DraftVersion, NOT NULL | |
| author_type | varchar(20) | NOT NULL | user, expert |
| author_id | uuid | NOT NULL | |
| text | text | NOT NULL | |
| position_start | int | NULL | Если комментарий к конкретному фрагменту |
| position_end | int | NULL | |
| created_at | timestamptz | NOT NULL | |

---

### Notification

Трекинг всех email-уведомлений.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | uuid | PK | |
| company_id | uuid | FK → Company, NOT NULL | |
| recipient_email | varchar(255) | NOT NULL | |
| notification_type | varchar(50) | NOT NULL | onboarding, approval_request, reminder, digest, topic_proposal |
| reference_type | varchar(50) | NULL | draft, expert, approval_step |
| reference_id | uuid | NULL | Полиморфная ссылка |
| email_token | varchar(255) | UNIQUE, NOT NULL | Токен для reply-to routing |
| magic_link_token | varchar(255) | UNIQUE, NULL | Для web-доступа |
| magic_link_expires_at | timestamptz | NULL | TTL magic link |
| magic_link_revoked | boolean | NOT NULL, default false | |
| status | varchar(20) | NOT NULL, default 'queued' | queued, sent, delivered, opened, replied, bounced |
| sent_at | timestamptz | NULL | |
| delivered_at | timestamptz | NULL | |
| replied_at | timestamptz | NULL | |
| created_at | timestamptz | NOT NULL | |

---

### AuditLog

Append-only журнал всех действий (Constitution IV, FR-016).

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | uuid | PK | |
| company_id | uuid | FK → Company, NOT NULL | Для tenant isolation |
| actor_type | varchar(20) | NOT NULL | user, expert, system |
| actor_id | uuid | NULL | NULL для system actions |
| action | varchar(100) | NOT NULL | Стандартизированные действия |
| entity_type | varchar(50) | NOT NULL | draft, expert, approval, claim и т.д. |
| entity_id | uuid | NOT NULL | |
| draft_version_id | uuid | NULL | FK → DraftVersion, если действие связано с версией |
| metadata | jsonb | default '{}' | Дополнительные данные |
| created_at | timestamptz | NOT NULL | |

**Immutability**: NO UPDATE, NO DELETE. BRIN-индекс на created_at.

**Standard actions** (неполный список):
- `expert.created`, `expert.onboarding_started`, `expert.voice_confirmed`
- `draft.created`, `draft.version_created`, `draft.status_changed`
- `claim.extracted`, `claim.verified`, `claim.expert_confirmed`
- `approval.requested`, `approval.granted`, `approval.changes_requested`
- `reminder.sent`, `reminder.escalated`
- `notification.sent`, `notification.delivered`, `notification.replied`

---

## Indexes (ключевые)

```sql
-- Tenant isolation
CREATE INDEX idx_expert_company ON expert(company_id);
CREATE INDEX idx_draft_company ON draft(company_id);
CREATE INDEX idx_audit_company_created ON audit_log(company_id, created_at) USING BRIN;

-- Draft lifecycle queries
CREATE INDEX idx_draft_status ON draft(company_id, status);
CREATE INDEX idx_draft_version_draft ON draft_version(draft_id, version_number);

-- Approval tracking
CREATE INDEX idx_approval_step_status ON approval_step(approval_flow_id, status);
CREATE INDEX idx_approval_decision_version ON approval_decision(draft_version_id);

-- Email routing
CREATE INDEX idx_notification_token ON notification(email_token);
CREATE INDEX idx_notification_magic ON notification(magic_link_token) WHERE magic_link_token IS NOT NULL;

-- Factcheck
CREATE INDEX idx_claim_version ON claim(draft_version_id);
```

---

## Validation Rules (из spec)

1. Expert email уникален в рамках компании: UNIQUE(company_id, email)
2. DraftVersion.version_number автоинкрементируется в рамках draft
3. ApprovalDecision MUST ссылаться на текущую версию (stale-version check в коде)
4. AuditLog — NO UPDATE, NO DELETE (enforce через DB permissions или app-level)
5. Magic link — TTL check при использовании, revocation flag
6. Statistics в draft без источника → reject (app-level validation в factcheck pipeline)
7. VoiceProfile.status = 'confirmed' требуется для создания реального контента
