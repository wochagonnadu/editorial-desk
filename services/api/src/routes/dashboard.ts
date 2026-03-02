// PATH: services/api/src/routes/dashboard.ts
// WHAT: GET /dashboard — агрегирует данные для Home-экрана менеджера
// WHY:  FR-010–014 — единый endpoint, structured logging по Principle VII
// RELEVANT: services/api/src/routes/dashboard-queries.ts, services/api/src/routes/dashboard-queries-pulse.ts, packages/shared/src/types/dashboard.ts

import { Hono } from 'hono';
import type { DashboardData } from '@newsroom/shared';
import { fetchTodayActions, fetchInReview, fetchWeekSchedule } from './dashboard-queries.js';
import { fetchTeamPulse, fetchActivityFeed } from './dashboard-queries-pulse.js';
import { getAuthUser } from './auth-middleware.js';
import type { RouteDeps } from './deps.js';

export const buildDashboardRoutes = (deps: RouteDeps): Hono => {
  const router = new Hono();
  const log = deps.logger.child({ module: 'dashboard' });

  router.get('/', async (context) => {
    const { companyId } = getAuthUser(context);
    log.info('dashboard.fetch', { company_id: companyId });

    // Параллельная агрегация всех блоков — минимум latency
    const [todayActions, inReview, weekSchedule, teamPulse, activityFeed] = await Promise.all([
      fetchTodayActions(deps, companyId),
      fetchInReview(deps, companyId),
      fetchWeekSchedule(deps, companyId),
      fetchTeamPulse(deps, companyId),
      fetchActivityFeed(deps, companyId),
    ]);

    const data: DashboardData = { todayActions, inReview, weekSchedule, teamPulse, activityFeed };
    log.info('dashboard.fetched', {
      company_id: companyId,
      actions: todayActions.length,
      in_review: inReview.length,
    });
    return context.json(data);
  });

  return router;
};
