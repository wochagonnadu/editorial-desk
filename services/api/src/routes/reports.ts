// PATH: services/api/src/routes/reports.ts
// WHAT: Owner-facing reports endpoint
// WHY:  Exposes monthly editorial metrics via API contract
// RELEVANT: services/api/src/core/reports.ts,apps/web/src/pages/ReportsPage.tsx

import { Hono } from 'hono';
import { buildMonthlyReport } from '../core/reports';
import { AppError } from '../core/errors';
import { authMiddleware, getAuthUser } from './auth-middleware';
import type { RouteDeps } from './deps';

const currentPeriod = () => {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
};

export const buildReportsRoutes = (deps: RouteDeps): Hono => {
  const router = new Hono();
  router.use('/*', authMiddleware);

  router.get('/monthly', async (context) => {
    const authUser = getAuthUser(context);
    if (authUser.role !== 'owner') throw new AppError(403, 'FORBIDDEN', 'Only owner can access reports');

    const period = context.req.query('month') ?? currentPeriod();
    const report = await buildMonthlyReport(deps.db, authUser.companyId, period);
    return context.json(report);
  });

  return router;
};
