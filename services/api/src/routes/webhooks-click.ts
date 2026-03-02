// PATH: services/api/src/routes/webhooks-click.ts
// WHAT: Approval click webhook processing handlers
// WHY:  Applies one-click email decisions with stale-version protection
// RELEVANT: services/api/src/routes/webhooks.ts,services/api/src/core/approval.ts

import { and, eq } from 'drizzle-orm';
import type { Context } from 'hono';
import { activateNextStep, consolidateFeedback, recordDecision } from '../core/approval';
import { logAudit } from '../core/audit';
import { buildDiffSummaryBullets } from '../core/diff-summary';
import { consolidatedFeedbackTemplate } from '../core/email-templates/approval';
import { AppError } from '../core/errors';
import {
  approvalFlowTable,
  approvalStepTable,
  draftTable,
  draftVersionTable,
  notificationTable,
  topicTable,
  userTable,
} from '../providers/db';
import { resolveApprover, sendApprovalRequest } from './approval-notify';
import type { RouteDeps } from './deps';

const parseParams = async (context: Context) => {
  const body = (await context.req.json().catch(() => ({}))) as Record<string, unknown>;
  const action = (context.req.query('action') ?? body.action ?? '') as
    | 'approve'
    | 'request_changes';
  const token = (context.req.query('token') ?? body.token ?? '') as string;
  const draftId = (context.req.query('draft') ?? body.draft ?? '') as string;
  const version = Number(context.req.query('version') ?? body.version ?? 0);
  const comment = String(body.comment ?? '').trim();
  return { action, token, draftId, version, comment: comment || undefined };
};

const CLICK_TOKEN_TTL_HOURS = 168;

export const processApprovalClick = (deps: RouteDeps) => async (context: Context) => {
  const { action, token, draftId, version, comment } = await parseParams(context);
  if (!token || !draftId || !['approve', 'request_changes'].includes(action)) {
    throw new AppError(400, 'VALIDATION_ERROR', 'invalid click payload');
  }

  const [notification] = await deps.db
    .select()
    .from(notificationTable)
    .where(
      and(
        eq(notificationTable.emailToken, token),
        eq(notificationTable.referenceType, 'approval_step'),
      ),
    )
    .limit(1);
  if (!notification || !notification.referenceId)
    throw new AppError(401, 'UNAUTHORIZED', 'invalid token');
  if (notification.status === 'replied') throw new AppError(409, 'CONFLICT', 'token already used');
  if (Date.now() - notification.createdAt.getTime() > CLICK_TOKEN_TTL_HOURS * 3600_000) {
    throw new AppError(401, 'UNAUTHORIZED', 'token expired');
  }

  const [step] = await deps.db
    .select()
    .from(approvalStepTable)
    .where(eq(approvalStepTable.id, notification.referenceId))
    .limit(1);
  if (!step) throw new AppError(404, 'NOT_FOUND', 'approval step not found');
  const [flow] = await deps.db
    .select()
    .from(approvalFlowTable)
    .where(eq(approvalFlowTable.id, step.approvalFlowId))
    .limit(1);
  if (!flow || flow.draftId !== draftId)
    throw new AppError(404, 'NOT_FOUND', 'approval flow not found');

  const [draft] = await deps.db
    .select()
    .from(draftTable)
    .where(eq(draftTable.id, draftId))
    .limit(1);
  const [currentVersion] = draft?.currentVersionId
    ? await deps.db
        .select()
        .from(draftVersionTable)
        .where(eq(draftVersionTable.id, draft.currentVersionId))
        .limit(1)
    : [];
  if (!draft || !currentVersion) throw new AppError(404, 'NOT_FOUND', 'draft not found');
  if (version && version !== currentVersion.versionNumber)
    throw new AppError(409, 'STALE_VERSION', 'version mismatch');

  await recordDecision(
    deps.db,
    step.id,
    currentVersion.id,
    action === 'approve' ? 'approved' : 'changes_requested',
    comment,
  );

  const steps = await deps.db
    .select()
    .from(approvalStepTable)
    .where(eq(approvalStepTable.approvalFlowId, flow.id));
  const hasChanges = steps.some((item) => item.status === 'changes_requested');
  const allDone = steps.every(
    (item) => item.status === 'approved' || item.status === 'changes_requested',
  );

  if (flow.flowType === 'sequential' && action === 'approve') {
    const nextStep = await activateNextStep(deps.db, flow.id, flow.deadlineHours);
    if (nextStep) {
      const approver = await resolveApprover(
        deps,
        nextStep.approverType as 'user' | 'expert',
        nextStep.approverId,
      );
      const [topic] = await deps.db
        .select()
        .from(topicTable)
        .where(eq(topicTable.id, draft.topicId))
        .limit(1);
      const [previousVersion] = await deps.db
        .select()
        .from(draftVersionTable)
        .where(
          and(
            eq(draftVersionTable.draftId, draft.id),
            eq(draftVersionTable.versionNumber, currentVersion.versionNumber - 1),
          ),
        )
        .limit(1);
      const changes = buildDiffSummaryBullets(
        previousVersion?.content ?? null,
        currentVersion.content,
      );
      await sendApprovalRequest(deps, {
        companyId: draft.companyId,
        draftId,
        stepId: nextStep.id,
        to: approver.email,
        title: topic?.title ?? 'Draft',
        summary: currentVersion.summary ?? currentVersion.content.slice(0, 200),
        version: currentVersion.versionNumber,
        changes,
      });
      await deps.db
        .update(notificationTable)
        .set({ status: 'replied', repliedAt: new Date() } as Partial<
          typeof notificationTable.$inferInsert
        >)
        .where(eq(notificationTable.id, notification.id));
      return context.json({ ok: true, next_step_id: nextStep.id });
    }
  }

  if (allDone) {
    await deps.db
      .update(approvalFlowTable)
      .set({ status: 'completed' } as Partial<typeof approvalFlowTable.$inferInsert>)
      .where(eq(approvalFlowTable.id, flow.id));
    await deps.db
      .update(draftTable)
      .set({
        status: hasChanges ? 'revisions' : 'approved',
        updatedAt: new Date(),
      } as Partial<typeof draftTable.$inferInsert>)
      .where(eq(draftTable.id, draftId));

    if (hasChanges) {
      const feedback = await consolidateFeedback(deps.db, flow.id);
      const [topic] = await deps.db
        .select()
        .from(topicTable)
        .where(eq(topicTable.id, draft.topicId))
        .limit(1);
      const [creator] = await deps.db
        .select()
        .from(userTable)
        .where(eq(userTable.id, flow.createdBy))
        .limit(1);
      if (creator) {
        const message = consolidatedFeedbackTemplate(topic?.title ?? 'Draft', feedback);
        await deps.email.sendEmail({
          to: creator.email,
          subject: message.subject,
          html: message.html,
          textBody: message.textBody,
        });
      }
    }
  }

  await logAudit(deps.db, {
    companyId: draft.companyId,
    actorType: step.approverType as 'user' | 'expert',
    actorId: step.approverId,
    action: `approval.${action === 'approve' ? 'granted' : 'changes_requested'}`,
    entityType: 'approval_step',
    entityId: step.id,
    draftVersionId: currentVersion.id,
    metadata: { flow_id: flow.id },
  });

  await deps.db
    .update(notificationTable)
    .set({ status: 'replied', repliedAt: new Date() } as Partial<
      typeof notificationTable.$inferInsert
    >)
    .where(eq(notificationTable.id, notification.id));
  return context.json({ ok: true, status: hasChanges ? 'changes_requested' : 'approved' });
};
