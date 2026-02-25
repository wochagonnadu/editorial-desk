// PATH: services/api/src/routes/approvals.ts
// WHAT: Approval workflow routes: list, remind, forward
// WHY:  US4 needs manager actions for stuck approvals
// RELEVANT: services/api/src/routes/approvals/list.ts,services/api/src/routes/approvals/remind.ts

import { Hono } from 'hono';
import { authMiddleware } from './auth-middleware';
import { forwardReviewer } from './approvals/forward';
import { getApprovals } from './approvals/list';
import { sendReminder } from './approvals/remind';
import type { RouteDeps } from './deps';

export const buildApprovalsRoutes = (deps: RouteDeps): Hono => {
  const router = new Hono();
  router.use('/*', authMiddleware);

  router.get('/', getApprovals(deps));
  router.post('/:stepId/remind', sendReminder(deps));
  router.post('/:stepId/forward', forwardReviewer(deps));

  return router;
};
