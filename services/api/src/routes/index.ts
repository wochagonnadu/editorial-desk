// PATH: services/api/src/routes/index.ts
// WHAT: API v1 router assembly with provider wiring hooks
// WHY:  Centralizes endpoint mounting and auth protection
// RELEVANT: services/api/src/routes/auth.ts,services/api/src/routes/companies.ts

import { Hono } from 'hono';
import { authMiddleware } from './auth-middleware';
import { buildAuthRoutes } from './auth';
import { buildCompanyRoutes } from './companies';
import type { RouteDeps } from './deps';

export const buildApiRouter = (deps: RouteDeps): Hono => {
  const router = new Hono();

  router.route('/auth', buildAuthRoutes(deps));
  router.use('/companies/*', authMiddleware);
  router.route('/companies', buildCompanyRoutes(deps));

  return router;
};
