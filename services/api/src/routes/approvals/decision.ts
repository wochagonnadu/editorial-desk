// PATH: services/api/src/routes/approvals/decision.ts
// WHAT: POST /approvals/:stepId/decision handler for manager decisions from queue
// WHY:  Closes approve/request_changes loop without email token path
// RELEVANT: services/api/src/routes/approvals.ts,services/api/src/core/approval.ts

import { and, eq } from 'drizzle-orm';
import type { Context } from 'hono';
import {
  activateNextStep,
  closeOpenStepsAsChangesRequested,
  completeFlowAndDraft,
  recordDecision,
} from '../../core/approval.js';
import { logAudit } from '../../core/audit.js';
import { buildDiffSummaryBullets } from '../../core/diff-summary.js';
import { AppError } from '../../core/errors.js';
import { readJsonBodyStrict } from '../../core/http/read-json-body.js';
import {
  approvalFlowTable,
  approvalStepTable,
  draftTable,
  draftVersionTable,
  topicTable,
} from '../../providers/db/index.js';
import { resolveApprover, sendApprovalRequest } from '../approval-notify.js';
import { getAuthUser } from '../auth-middleware.js';
import type { RouteDeps } from '../deps.js';

const parseBody = async (context: Context) => {
  const body = await readJsonBodyStrict<Record<string, unknown>>(context.req.raw);
  const rawAction = typeof body.action === 'string' ? body.action : '';
  const expectedVersionId =
    typeof body.expected_current_version_id === 'string'
      ? body.expected_current_version_id.trim()
      : '';
  const comment = typeof body.comment === 'string' ? body.comment.trim() : '';

  if (rawAction !== 'approve' && rawAction !== 'request_changes') {
    throw new AppError(400, 'VALIDATION_ERROR', 'action must be approve or request_changes');
  }
  const action: 'approve' | 'request_changes' = rawAction;
  if (!expectedVersionId) {
    throw new AppError(400, 'VALIDATION_ERROR', 'expected_current_version_id is required');
  }
  if (action === 'request_changes' && comment.length < 5) {
    throw new AppError(400, 'VALIDATION_ERROR', 'comment is required for request_changes');
  }

  return {
    action,
    expectedVersionId,
    comment: comment || undefined,
  };
};

export const decideApprovalStep = (deps: RouteDeps) => async (context: Context) => {
  const authUser = getAuthUser(context);
  const stepId = context.req.param('stepId');
  const { action, expectedVersionId, comment } = await parseBody(context);

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
  if (!flow || flow.status !== 'active') {
    throw new AppError(409, 'CONFLICT', 'Approval flow is not active');
  }

  const [draft] = await deps.db
    .select()
    .from(draftTable)
    .where(and(eq(draftTable.id, flow.draftId), eq(draftTable.companyId, authUser.companyId)))
    .limit(1);
  if (!draft || !draft.currentVersionId) throw new AppError(404, 'NOT_FOUND', 'Draft not found');
  if (draft.currentVersionId !== expectedVersionId) {
    throw new AppError(409, 'STALE_VERSION', 'Referenced version is stale');
  }

  await recordDecision(
    deps.db,
    step.id,
    draft.currentVersionId,
    action === 'approve' ? 'approved' : 'changes_requested',
    comment,
  );

  let nextStepId: string | null = null;
  let flowStatus = 'active';
  let draftStatus: typeof draft.status = draft.status;

  if (action === 'request_changes') {
    await closeOpenStepsAsChangesRequested(deps.db, flow.id);
  }

  if (flow.flowType === 'sequential' && action === 'approve') {
    const nextStep = await activateNextStep(deps.db, flow.id, flow.deadlineHours);
    nextStepId = nextStep?.id ?? null;
    if (nextStep) {
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

      const approver = await resolveApprover(
        deps,
        nextStep.approverType as 'user' | 'expert',
        nextStep.approverId,
      );
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
        stepId: nextStep.id,
        to: approver.email,
        title: topic.title,
        summary: version.summary ?? version.content.slice(0, 200),
        version: version.versionNumber,
        baseVersion: previousVersion?.versionNumber ?? null,
        changes,
      });
    }
  }

  const steps = await deps.db
    .select()
    .from(approvalStepTable)
    .where(eq(approvalStepTable.approvalFlowId, flow.id));
  const hasChanges = steps.some((item) => item.status === 'changes_requested');
  const allDone = steps.every(
    (item) => item.status === 'approved' || item.status === 'changes_requested',
  );

  if (allDone) {
    const finalDraftStatus = hasChanges ? 'revisions' : 'approved';
    draftStatus = finalDraftStatus;
    flowStatus = 'completed';
    await completeFlowAndDraft(deps.db, flow.id, draft.id, finalDraftStatus);
  }

  await logAudit(deps.db, {
    companyId: authUser.companyId,
    actorType: 'user',
    actorId: authUser.userId,
    action: action === 'approve' ? 'approval.granted' : 'approval.changes_requested',
    entityType: 'approval_step',
    entityId: step.id,
    draftVersionId: draft.currentVersionId,
    metadata: { flow_id: flow.id, source: 'approvals.queue' },
  });

  return context.json({
    ok: true,
    step_id: step.id,
    action,
    next_step_id: nextStepId,
    draft: {
      id: draft.id,
      status: draftStatus,
      current_version_id: draft.currentVersionId,
    },
    approval_flow: {
      id: flow.id,
      status: flowStatus,
    },
  });
};
