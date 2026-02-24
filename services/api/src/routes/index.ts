// PATH: services/api/src/routes/index.ts
// WHAT: API v1 router assembly with provider wiring hooks
// WHY:  Centralizes endpoint mounting and auth protection
// RELEVANT: services/api/src/routes/auth.ts,services/api/src/routes/companies.ts,services/api/src/routes/experts.ts

import { Hono } from 'hono';
import { authMiddleware } from './auth-middleware';
import { buildAuthRoutes } from './auth';
import { buildCompanyRoutes } from './companies';
import { buildDraftRoutes } from './drafts';
import { buildExpertRoutes } from './experts';
import { buildWebhookRoutes } from './webhooks';
import type { RouteDeps } from './deps';

export const buildApiRouter = (deps: RouteDeps): Hono => {
  const router = new Hono();

  router.route('/auth', buildAuthRoutes(deps));
  router.route('/webhooks', buildWebhookRoutes(deps));
  router.route('/drafts', buildDraftRoutes(deps));

  router.use('/companies/*', authMiddleware);
  router.use('/experts/*', authMiddleware);
  router.route('/companies', buildCompanyRoutes(deps));
  router.route('/experts', buildExpertRoutes(deps));

  return router;
};
