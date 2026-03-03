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

## Последняя подтвержденная репродукция (фактические метки времени)

Все метки ниже в `UTC+03:00` (из git-истории инцидентных правок 2026-03-03):

- `2026-03-03T11:38:56+03:00` — добавлен `db-ping` и диагностика timeout (`fix(api): add db connectivity diagnostics for vercel login timeout`).
- `2026-03-03T12:24:03+03:00` — добавлен `json-echo` probe и восстановлен node adapter (`fix(api): restore node vercel adapter and add json body parse probe`).
- `2026-03-03T12:35:02+03:00` — введен query fallback в login (`fix(auth): avoid vercel body-parse timeout by using query email fallback`).

Практический вывод: окно последней рабочей репродукции body timeout — до включения fallback, между `11:38` и `12:35` 3 марта 2026.

## Baseline лог-трейс login (Phase A)

- `auth.login.enter` -> вход в обработчик `POST /api/v1/auth/login`.
- `auth.login.after_parse_body` -> логируется после успешного чтения body (для query fallback этот шаг может отсутствовать).
- `auth.login.before_user_select` -> граница перед первым запросом в БД.

Это оставляем как опорный trace, чтобы в следующих фазах четко видеть: зависание на body parsing или уже после перехода к DB.

## Что было корнем

- Первичный сбой был в чтении request body на runtime-пути (`req.json()`/stream), а не в CORS и не в доступности БД.
- CORS-ошибка в браузере была вторичным следствием backend timeout (`504` без корректных CORS headers).
- `db-ping` подтверждал, что Postgres доступен, но сам по себе не диагностировал проблему body parsing.

## Финальное решение

- Для login введен выделенный guarded body reader с timeout и лимитом размера (`REQUEST_TIMEOUT`, `PAYLOAD_TOO_LARGE`, `INVALID_JSON`).
- Web-контракт возвращен на JSON body-only: `POST /api/v1/auth/login` с `{"email":"..."}` без query email.
- Debug cleanup: `POST /api/v1/debug/json-echo` удален из surface, оставлен только защищенный `GET /api/v1/debug/db-ping`.
- Техдолг TD-011 переведен в `closed` после возврата к безопасному контракту.

## Как диагностировать повторение

1. Проверить trace в логах login: `auth.login.enter` -> `auth.login.after_parse_body` -> `auth.login.before_user_select`.
2. Если зависание до `after_parse_body` — это снова body parsing/runtime путь.
3. Если `after_parse_body` есть, но нет `before_user_select` — смотреть route-логи и валидацию payload.
4. Если дошли до `before_user_select`, но есть задержка/ошибка — проверять DB путь отдельно через `GET /api/v1/debug/db-ping` c `x-cron-secret`.
5. Отдельно проверить web deep-link `/auth/verify?token=...`, чтобы исключить фронтовый routing-регресс.

## Критерии стабильности после фикса

- `POST /api/v1/auth/login` (JSON body) проходит без `504`.
- В логах Vercel нет `FUNCTION_INVOCATION_TIMEOUT` по login в течение 24 часов.
- В URL login-запросов нет `?email=`.
