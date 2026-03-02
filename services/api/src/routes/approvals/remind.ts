// PATH: services/api/src/routes/approvals/remind.ts
// WHAT: POST /approvals/:stepId/remind handler
// WHY:  FR-042 — gentle reminder email and audit event
// RELEVANT: services/api/src/routes/approvals.ts,services/api/src/core/email-templates/approval.ts

import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import type { Context } from 'hono';
import { reminderTemplate } from '../../core/email-templates/approval';
import { logAudit } from '../../core/audit';
import { AppError } from '../../core/errors';
import {
  approvalFlowTable,
  approvalStepTable,
  draftTable,
  notificationTable,
  topicTable,
} from '../../providers/db';
import { resolveApprover } from '../approval-notify';
import { getAuthUser } from '../auth-middleware';
import type { RouteDeps } from '../deps';

export const sendReminder = (deps: RouteDeps) => async (context: Context) => {
  const authUser = getAuthUser(context);
  const stepId = context.req.param('stepId');
  const log = deps.logger.child({
    module: 'approvals.remind',
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
  if (!draft) throw new AppError(404, 'NOT_FOUND', 'Draft not found');

  const [topic] = await deps.db
    .select()
    .from(topicTable)
    .where(eq(topicTable.id, draft.topicId))
    .limit(1);
  const approver = await resolveApprover(
    deps,
    step.approverType as 'user' | 'expert',
    step.approverId,
  );
  const message = reminderTemplate(
    topic?.title ?? 'Draft',
    step.deadlineAt ?? new Date(Date.now() + 24 * 3600_000),
  );

  log.info('approvals.remind.sending', { recipient: approver.email });
  await deps.db.insert(notificationTable).values({
    companyId: authUser.companyId,
    recipientEmail: approver.email,
    notificationType: 'approval_reminder',
    referenceType: 'approval_step',
    referenceId: step.id,
    emailToken: randomUUID(),
    status: 'sent',
    sentAt: new Date(),
  } as unknown as typeof notificationTable.$inferInsert);
  await deps.email.sendEmail({
    to: approver.email,
    subject: message.subject,
    html: message.html,
    textBody: message.textBody,
  });
  await logAudit(deps.db, {
    companyId: authUser.companyId,
    actorType: 'user',
    actorId: authUser.userId,
    action: 'approval.reminder_sent',
    entityType: 'approval_step',
    entityId: step.id,
    metadata: { draft_id: draft.id },
  });

  log.info('approvals.remind.sent');
  return context.json({ ok: true });
};
