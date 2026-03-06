// PATH: services/api/src/routes/index.ts
// WHAT: API v1 router assembly with provider wiring hooks
// WHY:  Centralizes endpoint mounting and auth protection
// RELEVANT: services/api/src/routes/auth.ts,services/api/src/routes/companies.ts,services/api/src/routes/topics.ts

import { Hono } from 'hono';
import { authMiddleware } from './auth-middleware.js';
import { buildAuthRoutes } from './auth.js';
import { buildAuditRoutes } from './audit.js';
import { buildApprovalsRoutes } from './approvals.js';
import { buildCompanyRoutes } from './companies.js';
import { buildDashboardRoutes } from './dashboard.js';
import { buildDebugRoutes } from './debug.js';
import { buildDocsRoutes } from './docs.js';
import { buildDraftRoutes } from './drafts.js';
import { buildExpertRoutes } from './experts.js';
import { buildLandingRequestRoutes } from './landing-requests.js';
import { buildReportsRoutes } from './reports.js';
import { buildTeamRoutes } from './team.js';
import { buildTopicRoutes } from './topics.js';
import { buildUserRoutes } from './users.js';
import { buildWebhookRoutes } from './webhooks.js';
import type { RouteDeps } from './deps.js';

export const buildApiRouter = (deps: RouteDeps): Hono => {
  const router = new Hono();

  router.route('/debug', buildDebugRoutes(deps));
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
  router.use('/team/*', authMiddleware);
  router.use('/users/*', authMiddleware);
  router.route('/companies', buildCompanyRoutes(deps));
  router.route('/dashboard', buildDashboardRoutes(deps));
  router.route('/experts', buildExpertRoutes(deps));
  router.route('/team', buildTeamRoutes(deps));
  router.route('/topics', buildTopicRoutes(deps));
  router.route('/users', buildUserRoutes(deps));

  return router;
};
