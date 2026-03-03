<!--
PATH: docs/verification-smoke-checklist.md
WHAT: Короткий smoke-чеклист проверки web+api после интеграции
WHY: Быстро подтвердить работоспособность критичных user flow перед релизом
RELEVANT: specs/004-api-adapter-integration/tasks.md,specs/004-api-adapter-integration/api-compat-matrix.md,apps/web/src/pages
-->

# Verification Smoke Checklist

## 1) Быстрые технические проверки

- `pnpm --filter @newsroom/web lint`
- `pnpm --filter @newsroom/web typecheck`
- `pnpm --filter @newsroom/web build`

Ожидаемо: все команды завершаются без ошибок.

## 2) API smoke (ручной прогон)

Проверить, что endpoint отвечает ожидаемым статусом и JSON-формой:

- `POST /api/v1/auth/login`
- `GET /api/v1/auth/verify`
- `GET /api/v1/dashboard`
- `GET /api/v1/experts`, `GET /api/v1/experts/:id`, `POST /api/v1/experts/:id/ping`
- `GET /api/v1/topics`, `POST /api/v1/topics`, `POST /api/v1/topics/:id/approve`
- `GET /api/v1/drafts`, `GET /api/v1/drafts/:id`, `GET /api/v1/drafts/:id/versions`
- `POST /api/v1/drafts/:id/versions`, `POST /api/v1/drafts/:id/comments`
- `POST /api/v1/drafts/:id/send-for-review`, `POST /api/v1/drafts/:id/claims/:claim_id/expert-confirm`
- `GET /api/v1/approvals`, `POST /api/v1/approvals/:stepId/remind`, `POST /api/v1/approvals/:stepId/forward`
- `GET /api/v1/audit`
- `GET /api/v1/companies/me`
- `POST /api/v1/landing/requests`

Ожидаемо: нет 5xx, ошибки валидации только при реально невалидном payload.

## 3) UI E2E smoke (основные сценарии)

1. Landing: отправка формы `Request Beta Access` показывает success или внятную ошибку.
2. Login: magic-link flow авторизует и переводит в `/app`.
3. Home: dashboard загружается без моков.
4. Experts: list/detail/ping/setup работают с реальными данными.
5. Create Draft: topic create -> approve -> create draft -> переход в editor.
6. Drafts: список отображается, переход в editor работает.
7. DraftEditor: save version, comment, send-for-review, claim confirm работают.
8. Approvals: list/remind/forward выполняются и обновляют экран.
9. Calendar: фильтры `status` и `expert` меняют выдачу.
10. Audit: лента событий грузится.
11. Settings: company и team читаются через API.
12. Logout: session очищается, возврат на `/login`.

## 3.1) Если данные пустые — это нормально

После перехода с demo-state на live API экраны могут быть пустыми, если в БД нет данных.
Это ожидаемо и не является багом интеграции.

Что обычно будет пустым на чистом окружении:

- `Experts`
- `Drafts`
- `Approvals`
- `Audit`
- части `Home` и `Calendar`

Минимальный сценарий наполнения (5-7 минут):

1. Пройти `Login` (magic link).
2. В `Experts` создать минимум одного активного эксперта.
3. В `Create Draft` создать тему и запустить draft.
4. Открыть `DraftEditor`, сохранить версию и добавить комментарий.
5. Отправить draft на review.
6. Проверить, что данные появились в `Drafts`, `Approvals`, `Audit`, `Calendar`, `Home`.

Ожидаемо: после этих шагов все ключевые страницы показывают непустые live-данные.

## 4) Регресс и контроль артефактов

- `grep` по `apps/web/src/pages` не находит `setTimeout(` в production-flow.
- Проверить, что `specs/004-api-adapter-integration/api-compat-matrix.md` актуален.
- Для каждого `partial` в матрице есть короткий риск-комментарий.

## 5) Go/No-Go

Go, если:

- tech-check (lint/typecheck/build) зеленый;
- критичные UI сценарии (Auth, Draft flow, Approvals) проходят;
- нет blocker-ошибок 5xx в API smoke.

No-Go, если:

- ломается auth/session;
- невозможно создать или обновить draft;
- approvals actions не работают;
- появились новые `partial` без описанного риска.

## 6) Auth timeout incident checks (March 3, 2026)

- `POST /api/v1/auth/login` (JSON body) не должен давать `504 FUNCTION_INVOCATION_TIMEOUT`.
- Deep-link `https://<web-domain>/auth/verify?token=...` не должен отдавать Vercel `404`.
- Если временно включен query-workaround login:
  - зафиксирован открытый `TD-011` в `docs/tech_debt.md`;
  - есть план удаления workaround;
  - перед релизом проверен возврат к JSON body-only контракту.
