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
- [!] В ручных тестах onboarding эксперта дошел только до email Step 1 (цепочка 1→5 требует отдельного hardening).
- [ ] Следующий этап: проверка и настройка USER STORIES в `docs/user_stories.md`.

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

6. **Settings read-only по сути**
   - Есть `GET /api/v1/companies/me`, но нет update endpoints.
   - Нет полноценных team/user-role endpoint-ов для управляемой команды из UI.

7. **Expert Setup расширенный save не закрыт контрактом**
   - Создание эксперта есть, но сохранение richer profile (tags/sources/background) не покрыто единым endpoint-ом.

8. **Надежность 5-шагового onboarding email процесса не подтверждена e2e**
   - Факт из ручного теста: пришел только Step 1 при добавлении эксперта.
   - Нужна отдельная проработка цепочки Step 1→5: триггеры, задержки, retries, observability, и проверка на Vercel/runtime-ограничениях.

## 2.3 P2 (эволюция к полной архитектуре PRD)

9. **Worker/queue слой как отдельный runtime еще не выделен**
   - PRD предполагает `services/worker` и явную оркестрацию.
   - Сейчас orchestration в основном внутри API.

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

1. [ ] Проверка и настройка USER STORIES в `docs/user_stories.md` (сверка с фактическим scope 001–009).
2. [ ] Отдельно проработать и проверить e2e onboarding эксперта до 5 email шагов (включая retries/таймауты/наблюдаемость).
3. [ ] Дожать `006-editorial-doc-surface-diff-ux` до PRD parity по doc/magic-link/diff.
4. [ ] Вернуться к `Settings + Team Management` контрактам (новые write/read endpoint-ы).
5. [ ] После стабилизации продукта решать `worker/runtime` и optional data-моделирование (`landing_request`, `evidence`).

## 6) Мини-вывод

Мы сохранили идею Editorial Desk и закрыли большой технологический разрыв через 001–009, включая вынужденные стабилизационные спеки по runtime/email.

Сейчас главный практический риск сместился в надежность реального onboarding-цикла эксперта (Step 1→5) и в PRD parity по doc/diff/settings.

Дальше лучше идти короткими итерациями: сначала user stories + e2e onboarding, потом оставшиеся продуктовые gap-ы.

## 7) Дальнейшие спеки

Идем строго по порядку нумерации, без пропусков:

1. `010-user-stories-alignment`
   - Scope: ревизия `docs/user_stories.md` под фактический контур 001–009, фиксация must/should/could.
   - Результат: актуальный и проверяемый story-бэклог без устаревших ожиданий.

2. `011-expert-onboarding-5-step-hardening`
   - Scope: довести onboarding эксперта до стабильной цепочки Step 1→5 (триггеры, retries, таймауты, наблюдаемость, e2e-checklist).
   - Результат: в ручных тестах и smoke-проверках проходят все 5 шагов, а не только Step 1.

3. `012-settings-team-management-contracts`
   - Scope: write/read контракты для Settings и команды (company update, users/roles/invite).
   - Результат: Settings перестает быть read-only, команда управляется из UI.

4. `013-worker-runtime-hardening`
   - Scope: поэтапное выделение worker/runtime и усиление очередей (идемпотентность, retries, visibility).
   - Результат: меньше хрупкости оркестрации под реальной нагрузкой.

5. `014-data-model-enhancements-optional`
   - Scope: `landing_request` как отдельная сущность, optional `evidence` table и минимальные индексы под отчеты.
   - Результат: улучшенная аналитика/аудит без преждевременного усложнения MVP.
