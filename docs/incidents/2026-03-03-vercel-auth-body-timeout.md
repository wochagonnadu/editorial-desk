<!--
PATH: docs/incidents/2026-03-03-vercel-auth-body-timeout.md
WHAT: RCA инцидента с timeout на magic-link login в Vercel
WHY: Зафиксировать причину, временный workaround и критерии полного cleanup
RELEVANT: services/api/src/routes/auth.ts,apps/web/src/services/auth.ts,docs/tech_debt.md
-->

# Incident: Vercel timeout на `POST /api/v1/auth/login` (March 3, 2026)

## Кратко

- Симптом в web: CORS-ошибка и `504 Gateway Timeout` при отправке magic-link.
- Фактическая причина: runtime timeout функции Vercel (`FUNCTION_INVOCATION_TIMEOUT`), а не CORS.
- Точка зависания: чтение request body (`await req.json()` и stream-reader), до бизнес-логики login.

## Что наблюдали

1. `OPTIONS /api/v1/auth/login` отвечал `204`.
2. `POST /api/v1/auth/login` зависал до 25 секунд и падал в `504`.
3. `GET /api/v1/debug/db-ping` стабильно отвечал `200` (`~700ms`) -> DB connectivity нормальная.
4. `POST /api/v1/debug/json-echo` возвращал `408 Body parse timeout` -> зависание на body stream.
5. После перехода на JSON-only через guarded parser `POST /api/v1/auth/login` давал `408 REQUEST_TIMEOUT` (`20/20`) без `504`.
6. После расширения CORS на `/v1/*` preflight начал падать с `500 TypeError: this.raw.headers.get is not a function`.

## Финальное решение

- Контракт login изменен на header-only: API читает email из `X-Auth-Email`.
- Web login отправляет `X-Auth-Email` и не отправляет email в query/body.
- Для CORS добавлен `X-Auth-Email` в `allowHeaders`.
- В auth-логах email маскируется, чтобы снизить PII риск.
- Vercel entrypoint переведен с `hono/vercel` на `@hono/node-server/vercel` (Node incoming req/res adapter).
- На 24 часа добавлены безопасные shape-логи входящего request в entrypoint (без значений заголовков) для быстрой верификации.

## Почему так

- Body parsing в Vercel runtime оказался нестабильным для login-path.
- Header-based transport не зависит от body stream и устраняет сам класс таймаутов.
- Это осознанный breaking change в контракте login ради стабильности прод-авторизации.
- Ошибка `headers.get is not a function` показала adapter mismatch: runtime давал Node request shape, а использовался адаптер под Web Request.

## План верификации

1. Smoke `POST /api/v1/auth/login` с `X-Auth-Email`: 20/20 без `408` и `504`.
2. Проверить `GET /api/v1/auth/verify`: без регрессии.
3. Проверить логи Vercel 24 часа: нет `FUNCTION_INVOCATION_TIMEOUT` для login.
4. После стабилизации закрыть TD-011 ссылкой на commit/PR.

## Критерии готовности

- `POST /api/v1/auth/login` с `X-Auth-Email` стабилен и не зависит от body parsing.
- В web/API нет передачи email через query string.
- В Vercel logs нет `FUNCTION_INVOCATION_TIMEOUT` по login в течение 24 часов.
