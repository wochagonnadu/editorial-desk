// PATH: services/api/src/routes/approvals/forward.ts
// WHAT: POST /approvals/:stepId/forward handler
// WHY:  FR-043 — manager can add another reviewer from selectable list
// RELEVANT: services/api/src/routes/approvals.ts,services/api/src/routes/approval-notify.ts

import { and, desc, eq } from 'drizzle-orm';
import type { Context } from 'hono';
import { logAudit } from '../../core/audit.js';
import { buildDiffSummaryBullets } from '../../core/diff-summary.js';
import { AppError } from '../../core/errors.js';
import {
  approvalFlowTable,
  approvalStepTable,
  draftTable,
  draftVersionTable,
  expertTable,
  topicTable,
  userTable,
} from '../../providers/db/index.js';
import { resolveApprover, sendApprovalRequest } from '../approval-notify.js';
import { getAuthUser } from '../auth-middleware.js';
import type { RouteDeps } from '../deps.js';

const parseBody = async (context: Context) =>
  (await context.req.json().catch(() => ({}))) as Record<string, unknown>;

const reviewerType = async (deps: RouteDeps, reviewerId: string): Promise<'user' | 'expert'> => {
  const [user] = await deps.db
    .select()
    .from(userTable)
    .where(eq(userTable.id, reviewerId))
    .limit(1);
  if (user) return 'user';
  const [expert] = await deps.db
    .select()
    .from(expertTable)
    .where(eq(expertTable.id, reviewerId))
    .limit(1);
  if (expert) return 'expert';
  throw new AppError(404, 'NOT_FOUND', 'Reviewer not found');
};

export const forwardReviewer = (deps: RouteDeps) => async (context: Context) => {
  const authUser = getAuthUser(context);
  const stepId = context.req.param('stepId');
  const body = await parseBody(context);
  const reviewerId = typeof body.reviewerId === 'string' ? body.reviewerId : '';
  if (!reviewerId) throw new AppError(400, 'VALIDATION_ERROR', 'reviewerId is required');
  const log = deps.logger.child({
    module: 'approvals.forward',
    company_id: authUser.companyId,
    step_id: stepId,
    actor: authUser.userId,
  });

  const [step] = await deps.db
    .select()
    .from(approvalStepTable)
    .where(eq(approvalStepTable.id, stepId))
    .limit(1);
  if (!step) throw new AppError(404, 'NOT_FOUND', 'Approval step not found');
  const [flow] = await deps.db
    .select()
    .from(approvalFlowTable)
    .where(eq(approvalFlowTable.id, step.approvalFlowId))
    .limit(1);
  if (!flow) throw new AppError(404, 'NOT_FOUND', 'Approval flow not found');
  const [draft] = await deps.db
    .select()
    .from(draftTable)
    .where(and(eq(draftTable.id, flow.draftId), eq(draftTable.companyId, authUser.companyId)))
    .limit(1);
  if (!draft || !draft.currentVersionId) throw new AppError(404, 'NOT_FOUND', 'Draft not found');

  const [lastStep] = await deps.db
    .select()
    .from(approvalStepTable)
    .where(eq(approvalStepTable.approvalFlowId, flow.id))
    .orderBy(desc(approvalStepTable.stepOrder))
    .limit(1);
  const type = await reviewerType(deps, reviewerId);
  const [created] = await deps.db
    .insert(approvalStepTable)
    .values({
      approvalFlowId: flow.id,
      stepOrder: (lastStep?.stepOrder ?? 0) + 1,
      approverType: type,
      approverId: reviewerId,
      status: 'pending',
      deadlineAt: new Date(Date.now() + flow.deadlineHours * 3600_000),
    } as unknown as typeof approvalStepTable.$inferInsert)
    .returning();

  const [version] = await deps.db
    .select()
    .from(draftVersionTable)
    .where(eq(draftVersionTable.id, draft.currentVersionId))
    .limit(1);
  const [topic] = await deps.db
    .select()
    .from(topicTable)
    .where(eq(topicTable.id, draft.topicId))
    .limit(1);
  if (!version || !topic) throw new AppError(404, 'NOT_FOUND', 'Draft context not found');

  const approver = await resolveApprover(deps, type, reviewerId);
  const [previousVersion] = await deps.db
    .select()
    .from(draftVersionTable)
    .where(
      and(
        eq(draftVersionTable.draftId, draft.id),
        eq(draftVersionTable.versionNumber, version.versionNumber - 1),
      ),
    )
    .limit(1);
  const changes = buildDiffSummaryBullets(previousVersion?.content ?? null, version.content);
  await sendApprovalRequest(deps, {
    companyId: authUser.companyId,
    draftId: draft.id,
    stepId: created.id,
    to: approver.email,
    title: topic.title,
    summary: version.summary ?? version.content.slice(0, 200),
    version: version.versionNumber,
    changes,
  });
  await logAudit(deps.db, {
    companyId: authUser.companyId,
    actorType: 'user',
    actorId: authUser.userId,
    action: 'approval.forwarded',
    entityType: 'approval_step',
    entityId: created.id,
    draftVersionId: draft.currentVersionId,
    metadata: { from_step_id: step.id, draft_id: draft.id },
  });

  log.info('approvals.forward.sent', { reviewer_id: reviewerId, reviewer_type: type });
  return context.json({ ok: true, step_id: created.id });
};
