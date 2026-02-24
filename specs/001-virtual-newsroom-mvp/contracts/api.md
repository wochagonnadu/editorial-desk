<!--
PATH: specs/001-virtual-newsroom-mvp/contracts/api.md
WHAT: REST API contract for Virtual Newsroom MVP
WHY: Defines endpoints between web SPA and API service before coding
RELEVANT: specs/001-virtual-newsroom-mvp/data-model.md,specs/001-virtual-newsroom-mvp/spec.md
-->

# API Contract: Virtual Newsroom MVP

**Base URL**: `/api/v1`
**Auth**: Bearer JWT (email-based login) or magic link token
**Format**: JSON, UTF-8

---

## Auth

### POST /auth/login
Отправляет magic link на email для входа.

**Request**:
```json
{ "email": "manager@clinic.com" }
```

**Response** `200`:
```json
{ "message": "Login link sent to email" }
```

**First login (implicit registration)**: If email is not found in the system, a new Company + User (owner) is created. The magic link email includes a welcome message with next steps (FR-001).

### GET /auth/verify
Верифицирует magic link, возвращает JWT.

**Query**: `?token={magic_link_token}`

**Response** `200`:
```json
{ "token": "jwt...", "user": { "id": "uuid", "email": "...", "role": "manager", "company_id": "uuid" } }
```

**Errors**: `401` invalid/expired token.

---

## Companies

### GET /companies/me
Текущая компания пользователя.

**Response** `200`:
```json
{
  "id": "uuid",
  "name": "Клиника доктора Иванова",
  "domain": "medical",
  "language": "ru"
}
```

---

## Experts

### GET /experts
Список экспертов компании.

**Query**: `?status=active` (опционально)

**Response** `200`:
```json
{
  "data": [{
    "id": "uuid",
    "name": "Др. Иванов",
    "role_title": "Кардиолог",
    "email": "ivanov@clinic.com",
    "domain": "medical",
    "status": "active",
    "voice_profile_status": "confirmed",
    "onboarding_progress": 5
  }]
}
```

### POST /experts
Добавить эксперта и запустить onboarding.

**Request**:
```json
{
  "name": "Др. Иванов",
  "role_title": "Кардиолог",
  "email": "ivanov@clinic.com",
  "domain": "medical",
  "public_text_urls": ["https://ivanov-blog.ru"]
}
```

**Response** `201`:
```json
{ "id": "uuid", "status": "pending" }
```

### GET /experts/:id
Детали эксперта с Voice Profile status.

### GET /experts/:id/onboarding
Прогресс onboarding-последовательности (5 шагов).

**Response** `200`:
```json
{
  "expert_id": "uuid",
  "steps": [
    { "step_number": 1, "status": "replied", "sent_at": "...", "replied_at": "..." },
    { "step_number": 2, "status": "sent", "sent_at": "...", "reminder_count": 1 },
    { "step_number": 3, "status": "pending" },
    { "step_number": 4, "status": "pending" },
    { "step_number": 5, "status": "pending" }
  ]
}
```

---

## Topics

### GET /topics
Список тем компании.

**Query**: `?status=proposed&expert_id=uuid` (опционально)

**Response** `200`:
```json
{
  "data": [{
    "id": "uuid",
    "title": "Что ожидать от первого приёма кардиолога",
    "description": "...",
    "source_type": "faq",
    "status": "proposed",
    "expert": { "id": "uuid", "name": "Др. Иванов" }
  }]
}
```

### POST /topics
Создать тему вручную (контент-менеджер).

**Request**:
```json
{
  "title": "Что ожидать от первого приёма кардиолога",
  "description": "Разбор типичных вопросов пациентов",
  "expert_id": "uuid",
  "source_type": "manual"
}
```

**Response** `201`:
```json
{ "id": "uuid", "status": "proposed" }
```

### POST /topics/:id/approve
Менеджер одобряет тему → тема уходит в draft pipeline.

**Response** `200`:
```json
{ "id": "uuid", "status": "approved" }
```

### POST /topics/:id/reject
Менеджер отклоняет тему.

**Request**:
```json
{ "reason": "Уже писали на эту тему" }
```

---

## Drafts

### GET /drafts
Список драфтов с Kanban-статусами.

**Query**: `?status=needs_review&expert_id=uuid` (опционально)

**Response** `200`:
```json
{
  "data": [{
    "id": "uuid",
    "topic": { "id": "uuid", "title": "..." },
    "expert": { "id": "uuid", "name": "Др. Иванов" },
    "status": "needs_review",
    "current_version": 3,
    "voice_score": 0.87,
    "factcheck_status": "completed",
    "updated_at": "..."
  }]
}
```

### GET /drafts/:id
Детали драфта: текущая версия, factcheck report, approval status.

**Response** `200`:
```json
{
  "id": "uuid",
  "status": "needs_review",
  "topic": { "id": "uuid", "title": "..." },
  "expert": { "id": "uuid", "name": "Др. Иванов" },
  "current_version": {
    "id": "uuid",
    "version_number": 3,
    "content": "Полный текст статьи...",
    "summary": "Краткое содержание...",
    "voice_score": 0.87,
    "created_at": "..."
  },
  "factcheck_report": {
    "status": "completed",
    "overall_risk_score": 0.15,
    "disclaimer_type": "medical",
    "results": [{
      "claim_id": "uuid",
      "text": "Инфаркт — причина 30% смертей",
      "risk_level": "high",
      "verdict": "confirmed",
      "evidence": [{ "source": "https://...", "snippet": "..." }]
    }]
  },
  "approval": {
    "flow_type": "sequential",
    "status": "active",
    "steps": [{
      "step_order": 1,
      "approver": { "name": "Менеджер Петрова" },
      "status": "approved"
    }, {
      "step_order": 2,
      "approver": { "name": "Др. Иванов" },
      "status": "pending",
      "deadline_at": "..."
    }]
  },
  "comments": [{
    "author": "Менеджер Петрова",
    "text": "Уточнить статистику в 3-м абзаце",
    "created_at": "..."
  }]
}
```

### GET /drafts/:id/versions
История версий с diff'ами.

**Response** `200`:
```json
{
  "data": [{
    "id": "uuid",
    "version_number": 3,
    "voice_score": 0.87,
    "diff_from_previous": { "added": 12, "removed": 5, "changes": [...] },
    "created_by": "revision",
    "created_at": "..."
  }]
}
```

### POST /drafts/:id/comments
Добавить комментарий (read-only UI, но комментарии можно оставлять).
Используется для инструкций к revision (см. POST /drafts/:id/revise).

**Request**:
```json
{
  "text": "Перефразировать вывод",
  "position_start": 1200,
  "position_end": 1350
}
```

### POST /drafts/:id/claims/:claim_id/expert-confirm
Эксперт подтверждает спорный claim (FR-025).

---

## Draft Pipeline (Step-by-Step)

Pipeline orchestration на фронтенде. UI последовательно вызывает каждый шаг.
Каждый шаг идемпотентен — повторный вызов безопасен.

### POST /drafts
Создать драфт из одобренной темы. Инициализирует Draft без контента — текст генерируется отдельно через POST /drafts/:id/generate.

**Request**:
```json
{ "topic_id": "uuid" }
```

**Response** `201`:
```json
{ "id": "uuid", "topic_id": "uuid", "expert_id": "uuid", "status": "drafting", "current_version": null }
```

**Errors**: `400` topic not approved or expert not confirmed, `409` draft already exists for this topic.

### POST /drafts/:id/generate
Генерация текста драфта по теме + voice profile эксперта.
Streaming response (SSE). Создаёт новую DraftVersion.

**Request**:
```json
{ "topic_id": "uuid" }
```

**Response** `200` (streaming, `text/event-stream`):
```
data: {"type":"chunk","text":"Первый абзац статьи..."}
data: {"type":"chunk","text":" продолжение текста..."}
data: {"type":"done","version_id":"uuid","version_number":1,"voice_score":0.85}
```

**Errors**: `400` expert not confirmed, `404` topic/draft not found, `503` LLM unavailable.

**Constraint**: Must complete within 25s (Vercel streaming limit).

### POST /drafts/:id/factcheck
Запуск factcheck для текущей версии драфта.
Streaming response — результаты по каждому claim.

**Response** `200` (streaming, `text/event-stream`):
```
data: {"type":"claim","claim_id":"uuid","text":"Инфаркт — причина 30% смертей","risk_level":"high"}
data: {"type":"verdict","claim_id":"uuid","verdict":"confirmed","evidence":[{"source":"...","snippet":"..."}]}
data: {"type":"done","report_id":"uuid","overall_risk_score":0.15,"disclaimer_type":"medical"}
```

**Errors**: `400` no current version, `409` stale version.

### POST /drafts/:id/send-for-review
Отправляет драфт на согласование: создаёт ApprovalFlow, отправляет email уведомления.
Синхронный вызов.

**Request**:
```json
{
  "flow_type": "sequential",
  "deadline_hours": 48,
  "steps": [
    { "approver_type": "user", "approver_id": "uuid" },
    { "approver_type": "expert", "approver_id": "uuid" }
  ]
}
```

**Response** `200`:
```json
{ "approval_flow_id": "uuid", "status": "active", "notifications_sent": 2 }
```

**Errors**: `400` factcheck not completed, `409` stale version.

### POST /drafts/:id/revise
Генерация новой версии на основе комментариев/правок.
Streaming response. Создаёт новую DraftVersion (version_number +1).

**Request**:
```json
{ "instructions": "Уточнить статистику в 3-м абзаце, смягчить вывод" }
```

**Response** `200` (streaming, `text/event-stream`):
```
data: {"type":"chunk","text":"Обновлённый текст..."}
data: {"type":"done","version_id":"uuid","version_number":2,"voice_score":0.88}
```

### POST /drafts/:id/voice-rating
Эксперт оценивает голосовое соответствие черновика (1–10). Constitution II: при score < 7 предлагаются неограниченные ревизии.

**Request**:
```json
{ "score": 8 }
```

**Response** `200`:
```json
{ "recorded": true, "below_threshold": false }
```

При score < 7: `{ "recorded": true, "below_threshold": true, "revision_offered": true }`

**Errors**: `400` invalid score (not 1-10), `404` draft not found, `403` only the assigned expert can rate.

---

## Cron Endpoints (Vercel Cron Jobs)

Вызываются Vercel Cron по расписанию. Защищены `CRON_SECRET` header.
2 бесплатных cron job'а на Vercel free tier.

### GET /api/cron/daily
Daily dispatcher: (1) отправляет напоминания по просроченным согласованиям (deadline expired), (2) по понедельникам — генерирует и отправляет еженедельные предложения тем менеджерам.
Запускается раз в сутки.

**Auth**: `Authorization: Bearer {CRON_SECRET}`

**Response** `200`:
```json
{ "reminders_sent": 3 }
```

### GET /api/cron/digest
Формирует и отправляет дайджест владельцу: статистика за период, задержки.
Запускается раз в неделю (или месяц — настраивается).

**Auth**: `Authorization: Bearer {CRON_SECRET}`

**Response** `200`:
```json
{ "digests_sent": 2 }
```

---

## Audit

### GET /audit
Журнал действий. Для владельца и менеджера.

**Query**: `?entity_type=draft&entity_id=uuid&limit=50&offset=0`

**Response** `200`:
```json
{
  "data": [{
    "id": "uuid",
    "actor": { "name": "Др. Иванов", "type": "expert" },
    "action": "approval.granted",
    "entity_type": "draft",
    "entity_id": "uuid",
    "draft_version_id": "uuid",
    "metadata": { "version_number": 3 },
    "created_at": "..."
  }],
  "total": 142
}
```

---

## Reports

### GET /reports/monthly
Месячный дайджест для владельца (P6).

**Query**: `?month=2026-02`

**Response** `200`:
```json
{
  "period": "2026-02",
  "drafts_created": 12,
  "drafts_approved": 8,
  "drafts_pending": 4,
  "avg_approval_days": 3.2,
  "delays": [{ "expert": "Др. Иванов", "draft_title": "...", "days_delayed": 5 }]
}
```

---

## Error Format

Все ошибки возвращаются в едином формате:

```json
{
  "error": {
    "code": "STALE_VERSION",
    "message": "Current version is v3, your action references v1",
    "details": { "current_version": 3, "referenced_version": 1 }
  }
}
```

Стандартные коды: `400` validation, `401` auth, `403` forbidden (role-based),
`404` not found, `409` conflict (stale version), `422` business rule violation.
