<!--
PATH: specs/001-virtual-newsroom-mvp/contracts/webhooks.md
WHAT: Webhook contracts for email processing (provider-agnostic) and external integrations
WHY: Defines internal types and webhook handlers independent of email provider
RELEVANT: specs/001-virtual-newsroom-mvp/contracts/api.md,specs/001-virtual-newsroom-mvp/research.md
-->

# Webhook Contracts: Virtual Newsroom MVP

Email-провайдер абстрагирован через адаптер. Webhook handler принимает
provider-specific payload, адаптер преобразует в internal типы ниже.

---

## Internal Types (provider-agnostic)

Бизнес-логика работает только с этими типами. Каждый email-провайдер
реализует адаптер `parseInbound(raw) → InboundEmail`.

```typescript
// packages/shared/src/email/types.ts

interface InboundEmail {
  from: string                    // sender email
  to: string                     // reply-to address with token
  subject: string
  textBody: string               // stripped reply (без цитирования)
  rawBody: string                // полный текст
  providerMessageId: string      // ID из провайдера для дедупликации
  receivedAt: Date
}

interface DeliveryEvent {
  providerMessageId: string
  recipient: string
  deliveredAt: Date
}

interface OpenEvent {
  providerMessageId: string
  firstOpen: boolean
  openedAt: Date
}

interface ClickEvent {
  providerMessageId: string
  url: string                    // кликнутая ссылка
  clickedAt: Date
}
```

---

## Inbound Email Webhook

**Endpoint**: `POST /webhooks/email/inbound`
**Auth**: Shared secret в header `X-Webhook-Secret`

Провайдер отправляет JSON при получении ответа на email.
Webhook handler: `rawPayload → adapter.parseInbound() → InboundEmail → processInbound()`.

**Token parsing** из `to` адреса:
```
reply+d_{draft_id}_v_{version}_exp_{expert_id}@inbound.newsroom.com
```

**Processing logic**:
1. Адаптер парсит provider-specific payload → `InboundEmail`
2. Извлечь токен из `to` → получить draft_id, version, expert_id
3. Проверить: expert_id совпадает с `from` email
4. Проверить: version == current_version (stale detection, FR-015)
5. Если stale → ответить email: «Актуальна версия vN, вот ссылка»
6. Если OK → распарсить действие из `textBody`
7. Записать в AuditLog

**Response**: `200 OK` (провайдеры ретраят при не-200)

---

## Delivery Webhook

**Endpoint**: `POST /webhooks/email/delivery`
**Auth**: Shared secret в header `X-Webhook-Secret`

Трекинг статуса доставки email.

**Processing**: `rawPayload → adapter.parseDelivery() → DeliveryEvent`
→ обновить `Notification.status` → `delivered`.

---

## Open Webhook

**Endpoint**: `POST /webhooks/email/open`

Трекинг открытия email (опционально для analytics).

**Processing**: `rawPayload → adapter.parseOpen() → OpenEvent`
→ обновить `Notification.status` → `opened`.

---

## Click Webhook

**Endpoint**: `POST /webhooks/email/click`

Обработка кликов на кнопки в email (Approve / Request Changes).

**Processing**: `rawPayload → adapter.parseClick() → ClickEvent`

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

---

## Email Adapter Interface

```typescript
// packages/shared/src/email/provider.ts

interface EmailProvider {
  // Отправка email
  sendEmail(params: {
    to: string
    from: string
    replyTo: string           // reply+token@inbound...
    subject: string
    html: string
    textBody?: string
    metadata?: Record<string, string>
  }): Promise<{ messageId: string }>

  // Парсинг webhook payloads
  parseInbound(raw: unknown): InboundEmail
  parseDelivery(raw: unknown): DeliveryEvent
  parseOpen(raw: unknown): OpenEvent
  parseClick(raw: unknown): ClickEvent

  // Верификация webhook signature
  verifyWebhookSignature(headers: Headers, body: string): boolean
}
```

Конкретная реализация (PostmarkAdapter, ResendAdapter) живёт в
`services/api/src/providers/email.ts`. Выбор через `EMAIL_PROVIDER` env var.
