// PATH: services/api/src/routes/index.ts
// WHAT: API v1 router assembly with provider wiring hooks
// WHY:  Centralizes endpoint mounting and auth protection
// RELEVANT: services/api/src/routes/auth.ts,services/api/src/routes/companies.ts,services/api/src/routes/topics.ts

import { Hono } from 'hono';
import { authMiddleware } from './auth-middleware';
import { buildAuthRoutes } from './auth';
import { buildAuditRoutes } from './audit';
import { buildApprovalsRoutes } from './approvals';
import { buildCompanyRoutes } from './companies';
import { buildDashboardRoutes } from './dashboard';
import { buildDocsRoutes } from './docs';
import { buildDraftRoutes } from './drafts';
import { buildExpertRoutes } from './experts';
import { buildLandingRequestRoutes } from './landing-requests';
import { buildReportsRoutes } from './reports';
import { buildTopicRoutes } from './topics';
import { buildWebhookRoutes } from './webhooks';
import type { RouteDeps } from './deps';

export const buildApiRouter = (deps: RouteDeps): Hono => {
  const router = new Hono();

  router.route('/auth', buildAuthRoutes(deps));
  router.route('/docs', buildDocsRoutes(deps));
  router.route('/webhooks', buildWebhookRoutes(deps));
  router.route('/landing', buildLandingRequestRoutes(deps));
  router.route('/drafts', buildDraftRoutes(deps));
  router.route('/audit', buildAuditRoutes(deps));
  router.route('/approvals', buildApprovalsRoutes(deps));
  router.route('/reports', buildReportsRoutes(deps));

  router.use('/companies/*', authMiddleware);
  router.use('/dashboard', authMiddleware);
  router.use('/dashboard/*', authMiddleware);
  router.use('/experts/*', authMiddleware);
  router.use('/topics/*', authMiddleware);
  router.route('/companies', buildCompanyRoutes(deps));
  router.route('/dashboard', buildDashboardRoutes(deps));
  router.route('/experts', buildExpertRoutes(deps));
  router.route('/topics', buildTopicRoutes(deps));

  return router;
};
