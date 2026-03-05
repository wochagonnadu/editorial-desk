// PATH: services/api/src/routes/approvals/list.ts
// WHAT: GET /approvals list handler for stuck and reviewer views
// WHY:  FR-040/041 — unified approval queue for manager actions
// RELEVANT: services/api/src/routes/approvals.ts,packages/shared/src/types/dashboard.ts

import { and, eq } from 'drizzle-orm';
import type { Context } from 'hono';
import {
  approvalFlowTable,
  approvalStepTable,
  draftTable,
  expertTable,
  topicTable,
  userTable,
} from '../../providers/db/index.js';
import { getAuthUser } from '../auth-middleware.js';
import type { RouteDeps } from '../deps.js';

const reviewerName = async (deps: RouteDeps, type: string, id: string) => {
  if (type === 'user') {
    const [user] = await deps.db.select().from(userTable).where(eq(userTable.id, id)).limit(1);
    return user?.name ?? 'Unknown reviewer';
  }
  const [expert] = await deps.db.select().from(expertTable).where(eq(expertTable.id, id)).limit(1);
  return expert?.name ?? 'Unknown reviewer';
};

export const getApprovals = (deps: RouteDeps) => async (context: Context) => {
  const authUser = getAuthUser(context);
  const view = context.req.query('view') === 'reviewer' ? 'reviewer' : 'stuck';
  const log = deps.logger.child({ module: 'approvals.list', company_id: authUser.companyId, view });
  log.info('approvals.list.requested');

  const steps = await deps.db
    .select()
    .from(approvalStepTable)
    .where(and(eq(approvalStepTable.status, 'pending')));

  const rows = await Promise.all(
    steps.map(async (step) => {
      const [flow] = await deps.db
        .select()
        .from(approvalFlowTable)
        .where(eq(approvalFlowTable.id, step.approvalFlowId))
        .limit(1);
      if (!flow) return null;
      const [draft] = await deps.db
        .select()
        .from(draftTable)
        .where(and(eq(draftTable.id, flow.draftId), eq(draftTable.companyId, authUser.companyId)))
        .limit(1);
      if (!draft) return null;
      const [topic] = await deps.db
        .select()
        .from(topicTable)
        .where(eq(topicTable.id, draft.topicId))
        .limit(1);
      const reviewer = await reviewerName(deps, step.approverType, step.approverId);
      return {
        stepId: step.id,
        draftId: draft.id,
        currentVersionId: draft.currentVersionId,
        draftTitle: topic?.title ?? 'Untitled',
        reviewer,
        status: step.status,
        timeWaitingSec: Math.floor((Date.now() - step.createdAt.getTime()) / 1000),
        deadline: step.deadlineAt?.toISOString(),
      };
    }),
  );

  const data = rows.filter((item): item is NonNullable<typeof item> => Boolean(item));
  if (view === 'reviewer') {
    data.sort((a, b) =>
      a.reviewer === b.reviewer
        ? b.timeWaitingSec - a.timeWaitingSec
        : a.reviewer.localeCompare(b.reviewer),
    );
  } else {
    data.sort((a, b) => b.timeWaitingSec - a.timeWaitingSec);
  }

  log.info('approvals.list.returned', { count: data.length });
  return context.json({ data });
};
