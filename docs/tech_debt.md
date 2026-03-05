<!--
PATH: docs/tech_debt.md
WHAT: Реестр технического долга: заглушки, костыли и временные решения
WHY: Не потерять временные решения и закрывать их системно по приоритету
RELEVANT: specs/004-api-adapter-integration/api-compat-matrix.md,docs/verification-smoke-checklist.md,apps/web/src/services
-->

# Tech Debt Register

Ниже фиксируем только временные решения, которые могут повлиять на стабильность, сроки или качество следующей волны.

## Как вести

- Добавляем запись сразу, как только появился workaround.
- У каждой записи есть владелец, риск и критерий закрытия.
- При закрытии не удаляем строку, а помечаем `closed` и ссылку на PR/commit.

## Записи

| ID     | Область             | Что временно сделано                                                                     | Риск                                                                            | Как закрыть                                                                                            | Приоритет | Статус |
| ------ | ------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | --------- | ------ |
| TD-001 | Auth dev            | В dev включен mock magic-link для любого email (автовход без почтового провайдера).      | Можно пропустить баги реального email-flow, если долго жить только на заглушке. | Прогонять отдельный smoke с реальным провайдером и затем отключить `DEV_MOCK_MAGIC_LINK` по умолчанию. | High      | open   |
| TD-002 | Auth dev            | Есть `DEV_DISABLE_AUTH` bypass.                                                          | Можно случайно тестировать без реальной авторизации.                            | Оставить только для локалки, проверить запрет в production и добавить явный чек в release-процедуру.   | High      | open   |
| TD-003 | Landing             | `POST /api/v1/landing/requests` отправляет email, но не пишет лид в БД.                  | Нет нормальной аналитики и повторной обработки лидов.                           | Добавить таблицу/сохранение запроса в БД + статус обработки.                                           | Medium    | open   |
| TD-004 | Calendar            | Календарь использует `updated_at` как surrogate даты события.                            | Планирование может быть неточным, дрейф по срокам.                              | Добавить явное поле `scheduled_at` в контракт drafts и перейти на него в UI.                           | High      | open   |
| TD-005 | Approvals UI        | Forward в UI сейчас ориентирован на экспертов (без полноценного выбора user-reviewer).   | Ограничения в реальных approval-цепочках.                                       | Расширить UI и endpoint-данные для выбора reviewer типов (`user`/`expert`) с валидацией.               | Medium    | open   |
| TD-006 | Settings            | Экран settings read-only по сути; write API для workspace/team нет.                      | Нельзя self-serve менять настройки и роли.                                      | Добавить write endpoint-ы (`PATCH/PUT /companies/me`, team management API) и подключить UI.            | High      | open   |
| TD-007 | Expert setup        | Нет полного update-контракта для расширенного профиля после создания эксперта.           | Часть onboarding-данных может теряться или жить вне источника правды.           | Добавить endpoint обновления expert profile + сохранить расширенные поля.                              | Medium    | open   |
| TD-008 | Draft editor        | SSE-flow (`generate/factcheck/revise`) не выведен в полноценный production UX.           | Больше ручных операций, медленнее цикл редакции.                                | Подключить SSE-действия в UI с понятными статусами и retry-сценариями.                                 | Medium    | open   |
| TD-009 | API client          | Base URL на web определяется эвристикой localhost/same-origin.                           | Риск неправильного адреса в нетипичных dev/stage конфигурациях.                 | Перейти на явную env-конфигурацию (`VITE_API_BASE_URL`) и fallback только для локалки.                 | Low       | open   |
| TD-010 | Draft review action | `send-for-review` в UI отправляет минимальную последовательную схему (48h, expert step). | Может не совпасть с бизнес-процессом отдельных команд.                          | Вынести конфиг review-flow в UI и отправлять пользовательский payload.                                 | Medium    | open   |
| TD-011 | Auth runtime (prod) | Login переведен на `X-Auth-Email` (header-only), чтобы обойти нестабильный body parsing. | Breaking change контракта login, риск рассинхрона клиентов и остаточных 5xx/408. | Подтвердить 24h стабильности в Vercel логах, обновить всех клиентов и закрыть запись ссылкой на commit/PR. | High      | open   |
| TD-012 | Worker handlers      | В `services/api/src/worker/handlers.ts` оставлен fallback `workerHandlers` со статусом `ignored` для резерва. | Можно случайно использовать fallback вместо реальных handler-ов и получить silent ignore. | Проверить, что в runtime используется только `createWorkerHandlers`, после проверки удалить fallback `workerHandlers`. | Medium    | open   |
| TD-013 | Topics + Factcheck UX | В web нет явного UI для `topics.suggest`, а в редакторе исторически смешивались flow фактчека и отправки на approval; контекст проверяемых claim/evidence был неполным. | Пользователь не понимает, что именно проверено и когда можно отправлять на review; часть LLM-возможностей недоступна из UI. | Выделить отдельный UI поток `Suggest topics`, закрепить раздельные кнопки `Run factcheck`/`Send for approval`, показывать claim/evidence/links в карточках и синхронизировать runbook T1.5. | High      | open   |
