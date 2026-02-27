<!--
PATH: docs/prd-gap-roadmap.md
WHAT: Детальный разбор разрывов между prd_start и текущей реализацией
WHY: Понять что еще не закрыто и разложить работу на реалистичные этапы/спеки
RELEVANT: docs/prd_start.md,docs/frontend-backend-gap-map.md,specs/004-api-adapter-integration/plan.md
-->

# PRD Gap Roadmap

Документ сверяет исходную идею из `docs/prd_start.md` с текущим состоянием кода.

Цель: убрать слепые зоны и превратить разрывы в управляемый план.

## 1) Что уже совпадает с PRD

- Есть базовый API-контур: auth, drafts, topics, approvals, audit, reports, webhooks.
- Есть 5-шаговый email onboarding эксперта и voice test flow.
- Есть stale-version safeguards для email действий (approve/changes на старую версию блокируется).
- Есть фактчекинг pipeline, approval reminders/escalations и monthly digest.
- Есть 1:1 UI-слой snapshot с ключевыми маршрутами `/`, `/login`, `/app/*`.

## 2) Основные gap-ы относительно начальной идеи

## 2.1 P0 (блокирует продуктовую ценность)

1. **UI не подключен к API**
   - Симптом: страницы `apps/web/src/pages/*` работают на локальных массивах и demo-state.
   - Последствие: продукт выглядит готовым, но не управляет реальными данными.
   - Как закрывать: web API adapter слой + поэкранная интеграция (без изменения визуала).

2. **Нет рабочего private auth-контура в web**
   - Симптом: `/login` demo через `setTimeout`, нет реального session/token цикла в UI.
   - Последствие: private маршруты не защищены как в PRD-процессе.
   - Как закрывать: login/verify + token storage + route guard.

3. **Отсутствует экран Audit в web**
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

## 2.3 P2 (эволюция к полной архитектуре PRD)

8. **Worker/queue слой как отдельный runtime еще не выделен**
   - PRD предполагает `services/worker` и явную оркестрацию.
   - Сейчас orchestration в основном внутри API.

9. **Landing request хранится без DB-следа**
   - Сейчас landing CTA шлет email, но не пишет заявку в отдельную сущность.
   - Для аналитики/CRM обычно нужна таблица заявок.

10. **Evidence как отдельная сущность не выделена**
    - В PRD фигурирует `Evidence`, а сейчас evidence живет в `factcheck_report.results` JSON.
    - Это может быть норм для MVP, но ограничивает аудитируемость и аналитику.

## 3) Как лучше резать на спеки

Да, логично закрывать отдельными спеками, не одной большой задачей.

Рекомендуемый набор:

### Spec 005: Web API Adapters Core

- Scope: auth session, Home, Experts, Drafts, DraftEditor, Approvals, Calendar, CreateDraft.
- Без миграций БД.
- Выход: UI перестает быть demo-state.

### Spec 006: Editorial Doc Surface + Audit UI

- Scope: Audit page, magic-link web-doc UX, diff summary/diff view в интерфейсе.
- Минимальные backend правки по необходимости.

### Spec 007: Settings + Team Management

- Scope: update company/defaults, team users/roles/invite.
- Почти наверняка потребуются новые backend endpoints.

### Spec 008: Workflow Runtime Hardening

- Scope: выделение `services/worker`, queue-driven orchestration, retries/idempotency visibility.
- Можно делать после стабилизации product flows, чтобы не усложнять ранний этап.

### Spec 009: Data Model Enhancements (optional)

- Scope: `landing_request` table, optional `evidence` table, нужные индексы/репорты.
- Запускать только после подтверждения реальной бизнес-нужды (не заранее).

## 4) Альтернатива: 4 больших этапа (если без множества спек)

Если хочется меньше административного overhead, можно вести как 4 крупных фазы:

1. **Этап A: Core adapters (P0)**
   - Закрывает реальную работу UI с backend.

2. **Этап B: PRD parity in UI (P1 часть)**
   - Audit screen + doc/diff UX.

3. **Этап C: Org/Settings contracts (P1 часть)**
   - Company update + team management APIs.

4. **Этап D: Runtime/data hardening (P2)**
   - Worker/queue и точечные DB-улучшения.

## 5) Рекомендуемый порядок (практичный)

1. Сначала **Spec 005** (или Этап A) — это максимальный value и проверка реального продукта.
2. Затем **Spec 006** — добиваем ключевую UX-обещанку PRD (audit + diff/doc).
3. Потом **Spec 007** — закрываем управленческие функции для команды.
4. В конце **Spec 008/009** — выносим runtime и data-усиления без риска затормозить core delivery.

## 6) Мини-вывод

Мы не потеряли идею Virtual Newsroom, но сейчас реализация находится между “красивый UI-слой” и “полноценный продуктовый контур”.

Критичный разрыв один: фронт пока не подключен к живым данным.

Остальные gap-ы лучше закрывать очередью отдельных спеков, а не одним большим рефакторингом.
