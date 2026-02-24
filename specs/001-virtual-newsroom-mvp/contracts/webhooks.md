<!--
PATH: specs/001-virtual-newsroom-mvp/contracts/webhooks.md
WHAT: Inbound webhook contracts for email parsing and external integrations
WHY: Defines how external services (Postmark) communicate with the API
RELEVANT: specs/001-virtual-newsroom-mvp/contracts/api.md,specs/001-virtual-newsroom-mvp/research.md
-->

# Webhook Contracts: Virtual Newsroom MVP

---

## Postmark Inbound Email Webhook

**Endpoint**: `POST /webhooks/email/inbound`
**Auth**: Shared secret in header `X-Webhook-Secret`

Postmark отправляет JSON при получении ответа на email.

**Incoming payload** (упрощённая Postmark Inbound schema):
```json
{
  "From": "ivanov@clinic.com",
  "To": "reply+d_42_v_3_exp_17@inbound.newsroom.com",
  "Subject": "Re: Ваш черновик готов к согласованию",
  "TextBody": "Текст ответа эксперта...",
  "StrippedTextReply": "Только новый текст без цитирования",
  "HtmlBody": "<html>...</html>",
  "MessageID": "postmark-message-id",
  "Date": "2026-02-24T10:30:00Z"
}
```

**Token parsing** из `To` адреса:
```
reply+d_{draft_id}_v_{version}_exp_{expert_id}@inbound.newsroom.com
```

**Processing logic**:
1. Извлечь токен из `To` → получить draft_id, version, expert_id
2. Проверить: expert_id совпадает с `From` email
3. Проверить: version == current_version (stale detection, FR-015)
4. Если stale → ответить email: «Актуальна версия vN, вот ссылка»
5. Если OK → распарсить действие из `StrippedTextReply`
6. Записать в AuditLog

**Response**: `200 OK` (Postmark требует 200, иначе ретрай)

---

## Postmark Delivery Webhook

**Endpoint**: `POST /webhooks/email/delivery`
**Auth**: Shared secret in header `X-Webhook-Secret`

Трекинг статуса доставки email.

**Incoming payload**:
```json
{
  "RecordType": "Delivery",
  "MessageID": "postmark-message-id",
  "DeliveredAt": "2026-02-24T10:30:05Z",
  "Recipient": "ivanov@clinic.com"
}
```

**Processing**: Обновить `Notification.status` → `delivered`.

---

## Postmark Open Webhook

**Endpoint**: `POST /webhooks/email/open`

Трекинг открытия email (опционально для analytics).

**Incoming payload**:
```json
{
  "RecordType": "Open",
  "MessageID": "postmark-message-id",
  "FirstOpen": true,
  "ReceivedAt": "2026-02-24T10:31:00Z"
}
```

**Processing**: Обновить `Notification.status` → `opened`.

---

## Postmark Click Webhook

**Endpoint**: `POST /webhooks/email/click`

Обработка кликов на кнопки в email (Approve / Request Changes).

**Incoming payload**:
```json
{
  "RecordType": "Click",
  "MessageID": "postmark-message-id",
  "OriginalLink": "https://app.newsroom.com/action?token=xyz&action=approve&draft=42&version=3",
  "ClickLocation": "HTML",
  "ReceivedAt": "2026-02-24T10:32:00Z"
}
```

**Processing**:
1. Извлечь `action`, `draft`, `version` из URL query
2. Валидировать `token` (TTL, not revoked)
3. Stale-version check
4. Выполнить действие (approve / request_changes)
5. Записать ApprovalDecision + AuditLog

---

## Magic Link Access

**Endpoint**: `GET /docs/:draft_id?token={magic_link_token}`

Не webhook, но связан с email — доступ к web-документу через magic link.

**Validation**:
1. `magic_link_token` exists в Notification
2. `magic_link_expires_at` > now()
3. `magic_link_revoked` == false
4. Пользователь получает read-only view текущей версии

**Errors**:
- `401` — token не найден
- `410` Gone — token expired или revoked (с инструкцией запросить новый)
- `409` — stale version (если token был для старой версии)
