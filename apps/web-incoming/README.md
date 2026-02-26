<!--
PATH: apps/web-incoming/README.md
WHAT: Точка приземления snapshot внешнего фронтенд-репозитория
WHY: Изолировать первичный импорт до поэтапного переноса в apps/web
RELEVANT: specs/003-frontend-snapshot-import/plan.md,specs/003-frontend-snapshot-import/runbook.md,apps/web/src/App.tsx
-->

# Web Incoming (Snapshot Staging)

Эта папка нужна как временный буфер для внешнего фронтенда.

Сюда кладем snapshot 1:1 из внешнего репо, чтобы сравнить структуру, роуты, env и API-ожидания без риска поломать `apps/web`.

## Правила

- Не подключаем этот app в `pnpm-workspace.yaml` до отдельного решения.
- Не правим бизнес-логику API под snapshot.
- Не переносим все сразу в `apps/web`; двигаемся экранами.
- Любая адаптация фиксируется в `specs/003-frontend-snapshot-import/`.

## Минимальная структура для snapshot

- `apps/web-incoming/src`
- `apps/web-incoming/public` (если есть)
- `apps/web-incoming/package.json`
- `apps/web-incoming/vite.config.*`
- `apps/web-incoming/tsconfig.*`

## Не импортируем

- `node_modules`
- `dist` / `build`
- `.env*`
- локальные кеши и IDE-файлы
