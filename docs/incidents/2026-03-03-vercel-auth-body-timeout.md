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
- Точка зависания: чтение JSON body (`await req.json()`), до бизнес-логики login.

## Что наблюдали

1. `OPTIONS /api/v1/auth/login` отвечал `204`.
2. `POST /api/v1/auth/login` зависал до 25 секунд и падал в `504`.
3. `GET /api/v1/debug/db-ping` стабильно отвечал `200` (`~700ms`) -> DB connectivity нормальная.
4. `POST /api/v1/debug/json-echo` возвращал `408 Body parse timeout` -> зависание на body stream.

## Временное решение

- В API login добавлен fallback чтения email из query (`?email=`), чтобы обойти `req.json()` в проде.
- Web login переведен на `POST /api/v1/auth/login?email=...` без JSON body.
- Для web добавлен SPA rewrite в `apps/web/vercel.json`, чтобы magic-link deep-link не давал `404`.

## Риски временного решения

- Email в query попадает в URL-логи (PII риск).
- Контракт login временно “раздвоен” (query + JSON).
- Нужен обязательный cleanup после стабилизации runtime.

## План полного cleanup

1. Стабилизировать body parsing в Vercel Node runtime (adapter/runtime версия, проверка на `json-echo`).
2. Вернуть web login на JSON body.
3. Удалить query-workaround из API.
4. Удалить debug-роуты `/api/v1/debug/*`.
5. Закрыть запись техдолга в `docs/tech_debt.md` со ссылкой на commit/PR.

## Критерии готовности к удалению workaround

- `POST /api/v1/debug/json-echo` проходит 30/30 без timeout.
- `POST /api/v1/auth/login` (JSON body) проходит 20/20 без `504`.
- В Vercel logs нет `FUNCTION_INVOCATION_TIMEOUT` по login в течение 24 часов.
