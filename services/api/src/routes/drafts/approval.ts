// PATH: services/api/src/routes/drafts/approval.ts
// WHAT: Send-for-review handler for approval workflow kickoff
// WHY:  Starts configurable approval flow and dispatches first notifications
// RELEVANT: services/api/src/core/approval.ts,services/api/src/core/email-templates/approval.ts

import { and, eq } from 'drizzle-orm';
import type { Context } from 'hono';
import { createFlow } from '../../core/approval';
import type { ApprovalConfig } from '../../core/approval';
import { logAudit } from '../../core/audit';
import { buildDiffSummaryBullets } from '../../core/diff-summary';
import { AppError } from '../../core/errors';
import {
  approvalFlowTable,
  draftTable,
  draftVersionTable,
  factcheckReportTable,
  topicTable,
} from '../../providers/db';
import { resolveApprover, sendApprovalRequest } from '../approval-notify';
import { getAuthUser } from '../auth-middleware';
import type { RouteDeps } from '../deps';

const parseConfig = (body: Record<string, unknown>): ApprovalConfig => {
  const flow_type = body.flow_type === 'parallel' ? 'parallel' : 'sequential';
  const deadline_hours =
    typeof body.deadline_hours === 'number' && body.deadline_hours > 0 ? body.deadline_hours : 48;
  const steps = Array.isArray(body.steps) ? body.steps : [];
  if (steps.length === 0) throw new AppError(400, 'VALIDATION_ERROR', 'steps are required');
  return {
    flow_type,
    deadline_hours,
    steps: steps.map((step) => {
      const item = step as { approver_type?: string; approver_id?: unknown };
      if (!['user', 'expert'].includes(item.approver_type ?? '')) {
        throw new AppError(400, 'VALIDATION_ERROR', 'invalid approver_type');
      }
      const approverId = String(item.approver_id ?? '');
      if (!approverId) throw new AppError(400, 'VALIDATION_ERROR', 'approver_id is required');
      return { approver_type: item.approver_type as 'user' | 'expert', approver_id: approverId };
    }),
  };
};

export const sendForReview = (deps: RouteDeps) => async (context: Context) => {
  const authUser = getAuthUser(context);
  const draftId = context.req.param('id');
  const body = (await context.req.json()) as Record<string, unknown>;
  const config = parseConfig(body);

  const [draft] = await deps.db
    .select()
    .from(draftTable)
    .where(and(eq(draftTable.id, draftId), eq(draftTable.companyId, authUser.companyId)))
    .limit(1);
  if (!draft || !draft.currentVersionId) throw new AppError(404, 'NOT_FOUND', 'Draft not found');
  const [factcheck] = await deps.db
    .select()
    .from(factcheckReportTable)
    .where(eq(factcheckReportTable.draftVersionId, draft.currentVersionId))
    .limit(1);
  if (!factcheck || factcheck.status !== 'completed')
    throw new AppError(400, 'INVALID_STATE', 'Factcheck must be completed');
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
  if (!version || !topic) throw new AppError(404, 'NOT_FOUND', 'Draft version not found');
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

  const { flow, steps } = await createFlow(deps.db, draft.id, authUser.userId, config);
  const pendingSteps = steps.filter((step) => step.status === 'pending');

  const notifications = await Promise.all(
    pendingSteps.map(async (step) => {
      const approver = await resolveApprover(
        deps,
        step.approverType as 'user' | 'expert',
        step.approverId,
      );
      await sendApprovalRequest(deps, {
        companyId: authUser.companyId,
        draftId: draft.id,
        stepId: step.id,
        to: approver.email,
        title: topic.title,
        summary: version.summary ?? version.content.slice(0, 200),
        version: version.versionNumber,
        changes,
      });
      return step.id;
    }),
  );

  await deps.db
    .update(draftTable)
    .set({ status: 'needs_review', updatedAt: new Date() })
    .where(eq(draftTable.id, draft.id));
  await deps.db
    .update(approvalFlowTable)
    .set({ status: 'active' })
    .where(eq(approvalFlowTable.id, flow.id));

  await logAudit(deps.db, {
    companyId: authUser.companyId,
    actorType: 'user',
    actorId: authUser.userId,
    action: 'approval.flow_started',
    entityType: 'approval_flow',
    entityId: flow.id,
    draftVersionId: draft.currentVersionId,
    metadata: { draft_id: draft.id, flow_type: flow.flowType, steps: config.steps.length },
  });

  return context.json({
    approval_flow_id: flow.id,
    status: 'active',
    notifications_sent: notifications.length,
  });
};
