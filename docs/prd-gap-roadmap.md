<!--
PATH: docs/prd-gap-roadmap.md
WHAT: Детальный разбор разрывов между prd_start и текущей реализацией
WHY: Понять что еще не закрыто и разложить работу на реалистичные этапы/спеки
RELEVANT: docs/prd_start.md,docs/frontend-backend-gap-map.md,specs/004-api-adapter-integration/plan.md
-->

# PRD Gap Roadmap

Документ сверяет исходную идею из `docs/prd_start.md` с текущим состоянием кода.

Цель: убрать слепые зоны и превратить разрывы в управляемый план.

## Статус на сегодня

- [x] Закрыт P0-блок из Spec 004 (API adapter integration + auth + audit в web).
- [x] Базовый UI-контур больше не считается demo-only в критичных продуктовых потоках.
- [x] Hardening onboarding 1→5 закрыт в Spec 011: цепочка проходит до voice rating email на preview.
- [x] Следующий этап: проверка и настройка USER STORIES в `docs/user_stories.md` (Spec 010, Phases A-D).
- [x] Settings + Team contracts закрыты в Spec 012 (company update + users/roles/invite + UI wiring).
- [x] Worker runtime hardening закрыт в Spec 013 (queue-контур + idempotency/retry/visibility для критичных cron jobs).

## 1) Что уже совпадает с PRD

- Есть базовый API-контур: auth, drafts, topics, approvals, audit, reports, webhooks.
- Есть 5-шаговый email onboarding эксперта и voice test flow.
- Есть stale-version safeguards для email действий (approve/changes на старую версию блокируется).
- Есть фактчекинг pipeline, approval reminders/escalations и monthly digest.
- Есть 1:1 UI-слой snapshot с ключевыми маршрутами `/`, `/login`, `/app/*`.

## 2) Основные gap-ы относительно начальной идеи

## 2.1 P0 (блокирует продуктовую ценность) — закрыто

1. **UI не подключен к API** ✅
   - Симптом: страницы `apps/web/src/pages/*` работают на локальных массивах и demo-state.
   - Последствие: продукт выглядит готовым, но не управляет реальными данными.
   - Как закрывать: web API adapter слой + поэкранная интеграция (без изменения визуала).

2. **Нет рабочего private auth-контура в web** ✅
   - Симптом: `/login` demo через `setTimeout`, нет реального session/token цикла в UI.
   - Последствие: private маршруты не защищены как в PRD-процессе.
   - Как закрывать: login/verify + token storage + route guard.

3. **Отсутствует экран Audit в web** ✅
   - PRD явно включает Audit как один из MVP-экранов.
   - Backend endpoint `GET /api/v1/audit` есть, но UI слоя нет.

## 2.2 P1 (важно для полного соответствия PRD)

4. **Web-doc experience неполный**
   - Сейчас `docs/:draft_id` read-only, а в PRD ожидается живой документ с понятной работой версий/комментариев.
   - Нужен фронтовой сценарий для magic-link документа и версии-контекста.

5. **Diff summary / diff view для ревьюеров не реализован до уровня PRD**
   - В PRD есть требование видеть, что изменилось между версиями.
   - Сейчас в письмах есть summary и действия, но нет полноценного diff-view UX.

6. **Settings read-only по сути** ✅
   - Добавлен `PATCH /api/v1/companies/me` с owner guard и audit.
   - Добавлены team endpoints `GET /api/v1/team/users`, `PATCH /api/v1/team/users/:id/role`, `POST /api/v1/team/invites`.
   - UI `/app/settings` подключен к write/read контрактам и больше не read-only.

7. **Expert Setup расширенный save не закрыт контрактом**
   - Создание эксперта есть, но сохранение richer profile (tags/sources/background) не покрыто единым endpoint-ом.

8. **Надежность 5-шагового onboarding email процесса подтверждена в Spec 011** ✅
   - Подтвержден e2e проход Step 1→5 и финальное письмо voice rating на preview.
   - Добавлены guards/idempotency, retries/reminders/escalation, наблюдаемость и тесты.

## 2.3 P2 (эволюция к полной архитектуре PRD)

9. **Worker/queue слой как отдельный runtime** ✅
   - Добавлен рабочий runtime-контур c enqueue/execute, idempotency key, retry policy и статусами выполнения.
   - Критичные cron задачи (approval overdue, onboarding reminders/escalations, monthly digest) исполняются через worker handlers.

10. **Landing request хранится без DB-следа**
   - Сейчас landing CTA шлет email, но не пишет заявку в отдельную сущность.
   - Для аналитики/CRM обычно нужна таблица заявок.

11. **Evidence как отдельная сущность не выделена**
     - В PRD фигурирует `Evidence`, а сейчас evidence живет в `factcheck_report.results` JSON.
     - Это может быть норм для MVP, но ограничивает аудитируемость и аналитику.

## 3) Фактический порядок и нумерация спеков

Ниже выровненный порядок по реальной истории работ (включая спеки, которые добавлялись по пути для стабилизации):

1. `001-virtual-newsroom-mvp`
2. `002-web-mvp-app`
3. `003-frontend-snapshot-import`
4. `004-api-adapter-integration`
5. `005-resend-email-dev-subdomains`
6. `006-editorial-doc-surface-diff-ux`
7. `007-vercel-auth-json-body-recovery`
8. `008-experts-create-timeout-recovery`
9. `009-vercel-body-stream-stability`

Коротко по смыслу добавленных спеков, которых раньше не было в этом документе:

- `005-resend-email-dev-subdomains`: закрывает dev-доставку писем на поддоменах и убирает ложные сбои в ручных проверках.
- `007-vercel-auth-json-body-recovery`: фикс восстановлений auth-потока при проблемах с JSON body на edge/runtime.
- `008-experts-create-timeout-recovery`: стабилизирует создание эксперта при таймаутах и неидеальной сети.
- `009-vercel-body-stream-stability`: фиксирует нестабильность body stream в Vercel, чтобы пайплайны не падали на ровном месте.

## 4) Альтернатива: 4 больших этапа (если без множества спек)

Если хочется меньше административного overhead, можно вести как 4 крупных фазы:

1. **Этап A: Core adapters (P0)**
   - Закрывает реальную работу UI с backend, включая auth и Audit screen.

2. **Этап B: PRD parity in UI (P1 часть)**
   - Doc/magic-link UX + diff summary/diff view.

3. **Этап C: Org/Settings contracts (P1 часть)**
   - Company update + team management APIs.

4. **Этап D: Runtime/data hardening (P2)**
   - Worker/queue и точечные DB-улучшения.

## 5) Что дальше (практичный порядок)

1. [x] Проверка и настройка USER STORIES в `docs/user_stories.md` (сверка с фактическим scope 001–009).
2. [x] Отдельно проработать и проверить e2e onboarding эксперта до 5 email шагов (включая retries/таймауты/наблюдаемость).
3. [x] Дожать `006-editorial-doc-surface-diff-ux` до PRD parity по doc/magic-link/diff (закрыто в `016`).
4. [x] Вернуться к `Settings + Team Management` контрактам (новые write/read endpoint-ы).
5. [x] После стабилизации продукта закрыт `worker/runtime` (Spec 013); optional data-моделирование (`landing_request`, `evidence`) остается на `014`.
6. [x] `014-data-model-enhancements-optional` закрыт как проектный контракт: зафиксированы сущности, bridge-режим, индексы, smoke-проверки и doc-sync.
7. [x] `015-llm-gateway-foundation` закрыт: единый gateway, prompt/version registry, policy+telemetry+safety, voice synthesis и рабочий smoke runbook (T1.5 перенесен в `022`).

## 6) Мини-вывод

Мы сохранили идею Editorial Desk и закрыли большой технологический разрыв через 001–009, включая вынужденные стабилизационные спеки по runtime/email.

Сейчас главный практический риск сместился в PRD parity по doc/diff/settings; onboarding Step 1→5 закрыт в Spec 011.

Дальше лучше идти короткими итерациями: сначала user stories + e2e onboarding, потом оставшиеся продуктовые gap-ы.

## 7) Дальнейшие спеки

Идем строго по порядку нумерации, без пропусков:

1. `010-user-stories-alignment` ✅
   - Scope: ревизия `docs/user_stories.md` под фактический контур 001–009, фиксация must/should/could.
   - Результат: актуальный и проверяемый story-бэклог без устаревших ожиданий.

2. `011-expert-onboarding-5-step-hardening` ✅
   - Scope: довести onboarding эксперта до стабильной цепочки Step 1→5 (триггеры, retries, таймауты, наблюдаемость, e2e-checklist).
   - Результат: в ручных тестах и smoke-проверках проходят все 5 шагов, а не только Step 1.

3. `012-settings-team-management-contracts` ✅
   - Scope: write/read контракты для Settings и команды (company update, users/roles/invite).
   - Результат: Settings перестает быть read-only, команда управляется из UI.

4. `013-worker-runtime-hardening` ✅
   - Scope: поэтапное выделение worker/runtime и усиление очередей (идемпотентность, retries, visibility).
   - Результат: меньше хрупкости оркестрации под реальной нагрузкой.

5. `014-data-model-enhancements-optional` ✅
   - Scope: `landing_request` как отдельная сущность, optional `evidence` table и минимальные индексы под отчеты.
   - Результат: улучшенная аналитика/аудит без преждевременного усложнения MVP.

6. `015-llm-gateway-foundation` ✅
   - Scope: ввести единый LLM gateway слой (provider adapter, prompt/version registry, timeout/retry/fallback, cost/latency/trace logging, базовые safety guardrails).
   - Результат: интеграция моделей становится управляемой и повторяемой, без размазанной логики вызовов по сервисам.

7. `016-editorial-doc-prd-parity` ✅
   - Scope: дожать `006` до полного doc/magic-link сценария: live document surface, явный version context, reviewer-friendly diff summary + diff view.
   - Результат: ревьюер видит «что поменялось и почему» прямо в документе, без ручного сопоставления версий из письма.

8. `017-expert-setup-rich-profile-save` ✅
   - Scope: закрыть gap по Expert Setup save: единый write/read контракт для role/tone/contacts/tags/sources/background с валидацией и audit trail.
   - Результат: профиль эксперта сохраняется полноценно и стабильно, генерация получает предсказуемый входной контекст.

9. `018-content-strategy-12w-output` ✅
   - Scope: реализовать structured output для Content Strategy Builder (12-week plan: pillars/clusters/FAQ/interlinking) + базовые действия копирования в работу через LLM gateway.
   - Результат: пользователь получает не «черный ящик», а применимый план, который можно сразу конвертировать в черновики.

10. `019-approvals-calendar-flow-hardening` ✅
     - Scope: довести approvals queue до рабочего менеджерского цикла (approve/request changes без тупиков) и синхронизировать с календарным планом публикаций.
     - Результат: выпуск не стопорится на ручных обходах, статусы материалов предсказуемо двигаются до публикации.

11. `020-settings-generation-controls` ✅
    - Scope: добавить в Settings управляемые параметры generation voice/тональности (guardrails, defaults, preview) как workspace-политику для LLM-пайплайна.
    - Результат: editorial tone задается один раз и применяется системно, а не «на глаз» в каждом драфте.

12. `021-web-ux-reliability-mobile-nav`
    - Scope: закрыть must-gap по UX-надежности: мобильный скролл без обрезаний, стабильная навигация back/forward, logout в 1 клик, явные loading/error состояния в ключевых действиях.
    - Результат: базовые сценарии проходят на телефоне и desktop одинаково предсказуемо, без потери контекста.

13. `022-topics-suggest-and-factcheck-ux-separation`
    - Scope: вернуть в web явный сценарий `topics.suggest` (кнопка/экран предложений тем), а также разделить в Draft Editor действия `Run factcheck` и `Send for approval` с понятным статусом и отображением проверяемых claim/evidence.
    - Результат: пользователь видит отдельный поток «предложить темы», фактчек запускается и читается как самостоятельный этап, а отправка на approval не смешивается с проверкой фактов.

## 8) Синхронизация с user stories (итог 010)

Конфликтов формулировок между `docs/prd-gap-roadmap.md` и `docs/user_stories.md` не найдено.

Правила синхронизации после 010:
- незакрытые backend-контракты из roadmap (Settings write/team management, Expert Setup save) в user stories помечены как `gap`;
- риск onboarding Step 1->5 закрыт в Spec 011 и снят как активная зависимость;
- закрытый P0-контур (`004`) в roadmap соответствует историям со статусом `done` по auth/drafts/approvals/factcheck.

### Changelog 010 (коротко)

- Размечены все user stories статусами `done | partial | gap`.
- Для `partial/gap` назначены приоритеты `must | should | could`.
- Формулировки историй уточнены под фактический scope `001-009` без завышенных ожиданий.
- Истории, зависящие от hardening onboarding, помечены тегом `dep:011`.

### Changelog 011 (коротко)

- Закрыт e2e onboarding эксперта по цепочке Step 1->5 с финализацией в voice rating email.
- Добавлены idempotency/ordering guards в webhook onboarding и безопасный `ignored` path без 500.
- Подключены reminder/escalation правила в daily cron с фиксируемым `stalled` статусом.
- Добавлены onboarding observability логи и API/web статус текущего шага.
- Добавлены unit+integration тесты и smoke-артефакт ручного прогона preview.

### Changelog 012 (коротко)

- Добавлен `PATCH /api/v1/companies/me` с валидацией полей, owner-only доступом и audit event `company.settings_updated`.
- Добавлен team API-контур: список пользователей, смена роли, приглашения с идемпотентностью по `company_id + email`.
- Зафиксированы edge-правила: повторный invite возвращает `reused=true`, self role change блокируется `CONFLICT`.
- Settings UI переведен на новые контракты (`save settings`, `invite user`, `change role`) с loading/error состояниями.

### Changelog 013 (коротко)

- Добавлен worker runtime контракт (`enqueue/execute`, `job_key`, retry/backoff/timeout) и отдельный entrypoint.
- Перенесены критичные cron side effects в worker handlers: approval overdue reminders, onboarding reminders/escalations, monthly digest.
- Добавлены worker-логи `worker.job.*` с обязательными полями (`job`, `key`, `attempt`, `duration_ms`, `result`).
- Добавлены unit-тесты на duplicate enqueue, transient retry и terminal fail; полный API test suite проходит.

### Changelog 014 (коротко)

- Зафиксирован контракт `landing_request`: жизненный цикл, поля для funnel/SLA, дедуп и идемпотентность.
- Спроектирован optional `evidence` table с bridge-режимом совместимости к `factcheck_report.results` JSON.
- Определен минимальный набор индексов под отчетные фильтры (`period/source/status` и `claim/time/status`).
- Добавлен smoke-checklist для проверки аналитики/аудита и fallback-поведения до включения read-preferred.

### Changelog 015 (коротко)

- Введен единый LLM gateway с runtime policy, prompt/version registry и обязательными `llm.request.*` telemetry-событиями.
- Все core use-case (`draft.generate`, `draft.revise`, `factcheck.extract`, `factcheck.verify`, `topics.suggest`) переведены на gateway-контракт.
- Добавлен контур синтеза `voice_profile` эксперта и обязательное использование voice-профиля в `draft.*`.
- Усилен фактчек: поддержка source links в verify и отображение evidence в web; action-логика `Run factcheck` отделена от `Send for approval`.
- Phase-H runbook закрыт; проверка `topics.suggest` smoke перенесена в отдельную `022` для отдельного UI/flow scope.

### Changelog 016 (коротко)

- Расширен `GET /api/v1/docs/:draft_id?token=...`: добавлены `version_context` и `diff` (`source/target`, summary, content) без нового endpoint.
- В `PublicDoc` добавлен явный version context (`current/base/updated/status`) и объяснимые `STALE_VERSION`/`TOKEN_EXPIRED` next-step.
- В magic-link документ встроены `What changed` (3-5 bullets), line-level diff view и fallback-состояния при недоступном сравнении.
- Approval email синхронизирован с doc surface: общий термин `What changed (base to current)` и явная строка сравниваемых версий.

### Changelog 017 (коротко)

- Добавлен `PATCH /api/v1/experts/:id/profile` и расширен `GET /api/v1/experts/:id` единым объектом `profile` для стабильного write/read цикла.
- Введена валидация rich profile по обязательным и форматным полям (`role`, `tone`, `contacts`, `sources`) с кодом `VALIDATION_ERROR`.
- Усилен company guard: для чужого эксперта возвращается `FORBIDDEN`, для отсутствующего — `NOT_FOUND`.
- На каждый save пишется audit-событие `expert.profile_saved` с `changed_sections` и `source=expert_setup`.
- Web Expert Setup подключен к create+save в один action, добавлены состояния `saving/success/error` и service-тесты save/reload маппинга.

### Changelog 018 (коротко)

- Добавлен backend endpoint `POST /api/v1/topics/strategy-plan` с валидацией входа, нормализацией structured output и стабильными ошибками `VALIDATION_ERROR`/`LLM_UPSTREAM_ERROR`.
- В LLM gateway добавлен use-case `content.strategy.plan` с prompt registry `content.strategy.12w@1.0.0` и отдельной runtime policy timeout/retry/fallback.
- В `CreateDraft` добавлен блок Strategy Builder: генерация 12-week плана (pillars/clusters/FAQ/interlinking) и визуализация interlink hints.
- Добавлены действия `Copy cluster` и `Copy FAQ` в текущий topics flow, чтобы элементы плана сразу превращались в рабочие темы.
- Добавлены проверки сценариев generate->copy->topic, copy->approve->create-draft и fallback при пустом/невалидном LLM output.

### Changelog 019 (коротко)

- В `Approvals` добавлены manager actions `Approve` и `Request changes` прямо из queue с version-lock (`expected_current_version_id`) и audit-событиями `approval.granted`/`approval.changes_requested`.
- Убран тупик в approval flow: при `request_changes` открытые `pending/waiting` шаги закрываются в `changes_requested`, draft предсказуемо переходит в `revisions`.
- Добавлен publish-plan контракт (`scheduled_publish_at`, `timezone`) в drafts/dashboard, а calendar/week schedule переведен на плановую дату публикации.
- Удален fallback `scheduledDate = updatedAt`; для материалов без даты добавлено явное состояние `unscheduled`.
- Проверка закрыта тестами: queue decision сценарии (approve/request changes + stale-version) и week schedule mapping по publish-plan.

### Changelog 020 (коротко)

- В `Settings` добавлен блок `Generation Controls`: workspace-level `tone`, `default_audience`, `guardrails` с сохранением через `PATCH /api/v1/companies/me`.
- Добавлен preview-контур `POST /api/v1/companies/me/generation-preview` без создания `draft/draft_version`, но с тем же prompt stack.
- В `draft.generate` и `draft.revise` прокинут `workspace_generation_policy_json`; приоритет policy зафиксирован в prompt templates.
- Добавлен fallback/валидация policy и тесты на сценарии `save->reload`, `preview`, `generate+revise` для стабильного editorial tone.
