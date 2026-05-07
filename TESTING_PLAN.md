<!--
PATH: TESTING_PLAN.md
WHAT: План внедрения достаточного набора автотестов по пользовательским сценариям
WHY: Сократить ручные клики и быстро ловить регрессии в ключевых продуктовых потоках
RELEVANT: package.json,apps/web/package.json,services/api/package.json,services/api/vitest.config.ts
-->

# План тестирования пользовательских сценариев

## Цель

Собрать минимальный набор автотестов, который заменяет повторное ручное кликанье: быстрые service/API-тесты для логики и 2-3 browser smoke-теста только для критичных сквозных путей.

## Правила

- Не добавлять зависимости, если хватает текущих `node:test`, `vitest`, `tsx`, `vite`.
- Сначала подключить уже написанные web-тесты, потом дописывать недостающие.
- Browser/e2e использовать только для реального пользовательского пути через UI.
- Закрывать чекбокс только после указанной проверки.
- Уровни GPT-5.5 reasoning: `low`, `medium`, `high`, `xhigh`.

## План

- [ ] **Подключить существующие web-тесты.**
  Описание: в `apps/web/src/services/__tests__` и `apps/web/src/pages/create-draft/__tests__` уже есть тесты, но `apps/web/package.json` сейчас выводит `web: no tests yet`. Нужно заменить заглушку на реальный запуск и добавить `test:watch`, если выбранный runner это поддерживает.
  Достаточно: `pnpm --filter @newsroom/web test` реально запускает web-тесты и падает при регрессии.
  Проверка: `pnpm --filter @newsroom/web test`.
  GPT-5.5 reasoning: `medium`.

- [ ] **Проверить общий test pipeline.**
  Описание: убедиться, что `pnpm test` через turbo запускает API, web и shared без ложного успеха. Shared-заглушка допустима, если тестов там нет; web-заглушка должна исчезнуть.
  Достаточно: общий прогон показывает реальные тесты `@newsroom/api` и `@newsroom/web`.
  Проверка: `pnpm test`.
  GPT-5.5 reasoning: `low`.

- [ ] **Покрыть web auth service.**
  Описание: проверить magic-link login через `X-Auth-Email`, отсутствие email в query/body, logout, очистку сессии и понятное пробрасывание ошибок API в UI-слой. Backend мокать через `fetch`.
  Достаточно: сценарии входа/выхода проверяются без реального API.
  Проверка: `pnpm --filter @newsroom/web test`.
  GPT-5.5 reasoning: `medium`.

- [ ] **Покрыть auth API негативными сценариями.**
  Описание: расширить API-тесты для пустого email, невалидного email, ошибки отправки письма и повторного запроса. Внешний email-сервис не трогать.
  Достаточно: ошибки стабильны по HTTP-статусу и payload.
  Проверка: `pnpm --filter @newsroom/api test`.
  GPT-5.5 reasoning: `medium`.

- [ ] **Зафиксировать onboarding API happy path.**
  Описание: проверить 5-шаговый путь менеджера: company, workspace settings, team, generation settings, завершение onboarding. Использовать существующие тестовые моки/хранилище, без реальной БД.
  Достаточно: тест подтверждает финальный статус и сохранённые настройки.
  Проверка: `pnpm --filter @newsroom/api test`.
  GPT-5.5 reasoning: `medium`.

- [ ] **Добавить web service-тесты onboarding.**
  Описание: проверить отправку шагов, обработку неполных данных и то, что frontend не считает onboarding завершённым до финального API-ответа.
  Достаточно: покрыты happy path и 1-2 ошибки валидации.
  Проверка: `pnpm --filter @newsroom/web test`.
  GPT-5.5 reasoning: `medium`.

- [ ] **Расширить service-тест основного content flow.**
  Описание: проверить путь `generate strategy plan -> create topic -> approve topic -> create draft`; добавить негативный сценарий, где ошибка одного шага не запускает следующий.
  Достаточно: порядок API-вызовов и тела запросов проверяются без UI.
  Проверка: `pnpm --filter @newsroom/web test`.
  GPT-5.5 reasoning: `medium`.

- [ ] **Укрепить API integration-тест content cycle.**
  Описание: проверить backend-путь от topic до draft и approval/public-doc состояния, включая статусы, ids и один конфликт/ошибку состояния.
  Достаточно: есть один happy path и один негативный сценарий.
  Проверка: `pnpm --filter @newsroom/api test`.
  GPT-5.5 reasoning: `high`.

- [ ] **Покрыть draft editor API-состояния.**
  Описание: проверить успешное сохранение драфта, stale version, generation policy и factcheck-состояние, не затирая свежие данные при конфликте версии.
  Достаточно: есть тест на успешное сохранение и тест на конфликт версии.
  Проверка: `pnpm --filter @newsroom/api test`.
  GPT-5.5 reasoning: `high`.

- [ ] **Добавить web service-тесты draft editor.**
  Описание: проверить загрузку драфта, сохранение, ошибку сохранения и сохранность текста в клиентском состоянии после ошибки API.
  Достаточно: frontend не теряет текст драфта при неуспешном save.
  Проверка: `pnpm --filter @newsroom/web test`.
  GPT-5.5 reasoning: `medium`.

- [ ] **Покрыть approvals.**
  Описание: проверить список approval items, approve, reject, повторное решение и ошибку API. Статусы держать в API-тестах, клиентскую обвязку в web service-тестах.
  Достаточно: повторное действие не ломает состояние, ошибки видны клиенту.
  Проверка: `pnpm --filter @newsroom/api test && pnpm --filter @newsroom/web test`.
  GPT-5.5 reasoning: `medium`.

- [ ] **Покрыть settings, team и expert profile.**
  Описание: проверить сохранение workspace settings, generation controls, team member и expert profile, переиспользуя текущие `settings-team` и `experts-profile` тесты.
  Достаточно: после сохранения данные читаются обратно в нормализованной форме.
  Проверка: `pnpm --filter @newsroom/web test && pnpm --filter @newsroom/api test`.
  GPT-5.5 reasoning: `medium`.

- [ ] **Добавить browser smoke `login/onboarding`.**
  Описание: открыть приложение в браузере, пройти минимальный вход/первый запуск на тестовых моках или локальном API, без проверки всех полей.
  Достаточно: пользователь попадает из login/onboarding в рабочую область.
  Проверка: локальный dev server + browser smoke command.
  GPT-5.5 reasoning: `high`.

- [ ] **Добавить browser smoke `create topic -> draft editor`.**
  Описание: через UI пройти главный путь создания контента: strategy/topic, approve, create draft, открыть editor.
  Достаточно: editor открыт с созданным draft id.
  Проверка: локальный dev server + browser smoke command.
  GPT-5.5 reasoning: `high`.

- [ ] **Добавить browser smoke `edit draft -> save`.**
  Описание: открыть существующий draft, изменить текст, сохранить и дождаться успешного состояния. Edge cases оставить API/service-тестам.
  Достаточно: после reload сохранённый текст остаётся на месте.
  Проверка: локальный dev server + browser smoke command.
  GPT-5.5 reasoning: `high`.

- [ ] **Задокументировать быстрые команды и правило PR.**
  Описание: добавить команды для `api test:watch`, `web test:watch`, `pnpm test`, `pnpm check`, `pnpm check:ci` и описать, какие тесты обязательны для auth, onboarding, content flow, draft editor, approvals/settings.
  Достаточно: по изменённому сценарию понятно, какой минимальный набор тестов запускать.
  Проверка: сверить команды с `package.json`, затем выполнить `pnpm check:ci`.
  GPT-5.5 reasoning: `medium`.

## Done criteria

- [ ] `pnpm --filter @newsroom/web test` запускает реальные web-тесты.
- [ ] `pnpm --filter @newsroom/api test` проходит.
- [ ] `pnpm test` запускает все пакетные тесты.
- [ ] Главный content flow покрыт service/API/browser smoke-тестами.
- [ ] Browser smoke-тестов не больше необходимого минимума.
- [ ] В документации есть быстрые команды для ежедневной разработки.
