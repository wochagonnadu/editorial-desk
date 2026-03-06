// PATH: services/api/src/worker/jobs/approval-overdue.ts
// WHAT: Worker handler for overdue approval reminder/escalation side effects
// WHY:  Moves reminder dispatch from cron loop into idempotent worker execution
// RELEVANT: services/api/src/routes/cron.ts,services/api/src/core/email-templates/approval.ts

import { eq, sql } from 'drizzle-orm';
import { findSenderNameByUserId } from '../../core/email-sender.js';
import { reminderTemplate } from '../../core/email-templates/approval.js';
import {
  approvalFlowTable,
  approvalStepTable,
  draftTable,
  topicTable,
} from '../../providers/db/index.js';
import type { WorkerRuntimeDeps } from '../bootstrap.js';
import { approverEmail, findUserEmail } from './approval-overdue-helpers.js';

export const runApprovalOverdueJob = async (
  deps: WorkerRuntimeDeps,
  payload: { stepId: string; reminderCount: number },
) => {
  const [step] = await deps.db
    .select()
    .from(approvalStepTable)
    .where(eq(approvalStepTable.id, payload.stepId))
    .limit(1);
  if (
    !step ||
    step.status !== 'pending' ||
    step.reminderCount !== payload.reminderCount ||
    !step.deadlineAt
  ) {
    return { status: 'ignored' as const, reason: 'step_not_due' };
  }

  const [flow] = await deps.db
    .select()
    .from(approvalFlowTable)
    .where(eq(approvalFlowTable.id, step.approvalFlowId))
    .limit(1);
  if (!flow) return { status: 'ignored' as const, reason: 'flow_not_found' };

  const [draft] = await deps.db
    .select()
    .from(draftTable)
    .where(eq(draftTable.id, flow.draftId))
    .limit(1);
  if (!draft) return { status: 'ignored' as const, reason: 'draft_not_found' };
  const [topic] = await deps.db
    .select()
    .from(topicTable)
    .where(eq(topicTable.id, draft.topicId))
    .limit(1);
  const email = await approverEmail(deps, step.approverType, step.approverId);
  if (!email) return { status: 'ignored' as const, reason: 'approver_missing' };

  const template = reminderTemplate(topic?.title ?? 'Draft', step.deadlineAt);
  const fromName =
    step.approverType === 'expert' ? await findSenderNameByUserId(deps.db, flow.createdBy) : undefined;
  await deps.email.sendEmail({
    to: email,
    subject: template.subject,
    html: template.html,
    textBody: template.textBody,
    fromName,
  });
  await deps.db.execute(
    sql`update approval_step set reminder_count = reminder_count + 1 where id = ${step.id}`,
  );

  let escalationsSent = 0;
  if (step.reminderCount >= 2) {
    const ownerEmail = await findUserEmail(deps, flow.createdBy);
    if (ownerEmail) {
      await deps.email.sendEmail({
        to: ownerEmail,
        subject: `Escalation: approval stalled for ${topic?.title ?? 'Draft'}`,
        textBody: `Approval step ${step.stepOrder} is overdue after ${step.reminderCount + 1} reminders.`,
        html: `<p>Approval step <strong>${step.stepOrder}</strong> is overdue after ${step.reminderCount + 1} reminders.</p>`,
      });
      escalationsSent = 1;
    }
  }

  return {
    status: 'succeeded' as const,
    reason: 'approval_reminder_sent',
    metrics: { reminders_sent: 1, escalations_sent: escalationsSent },
  };
};
