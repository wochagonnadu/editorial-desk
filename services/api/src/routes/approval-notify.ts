// PATH: services/api/src/routes/approval-notify.ts
// WHAT: Shared helpers for approval notification delivery
// WHY:  Avoids duplicated email-token and approver lookup logic
// RELEVANT: services/api/src/routes/drafts/approval.ts,services/api/src/routes/webhooks-click.ts

import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { approvalRequestTemplate } from '../core/email-templates/approval';
import { AppError } from '../core/errors';
import { expertTable, notificationTable, userTable } from '../providers/db';
import type { RouteDeps } from './deps';

export const resolveApprover = async (deps: RouteDeps, type: 'user' | 'expert', id: string) => {
  if (type === 'user') {
    const [user] = await deps.db.select().from(userTable).where(eq(userTable.id, id)).limit(1);
    if (!user) throw new AppError(404, 'NOT_FOUND', 'Approver not found');
    return { id: user.id, email: user.email, name: user.name };
  }
  const [expert] = await deps.db.select().from(expertTable).where(eq(expertTable.id, id)).limit(1);
  if (!expert) throw new AppError(404, 'NOT_FOUND', 'Approver not found');
  return { id: expert.id, email: expert.email, name: expert.name };
};

export const sendApprovalRequest = async (
  deps: RouteDeps,
  input: { companyId: string; draftId: string; stepId: string; to: string; title: string; summary: string; version: number },
) => {
  const token = randomUUID();
  await deps.db.insert(notificationTable).values({
    companyId: input.companyId,
    recipientEmail: input.to,
    notificationType: 'approval_request',
    referenceType: 'approval_step',
    referenceId: input.stepId,
    emailToken: token,
    status: 'sent',
    sentAt: new Date(),
  });

  const email = approvalRequestTemplate({
    appUrl: process.env.APP_URL ?? 'http://localhost:5173',
    draftId: input.draftId,
    token,
    version: input.version,
    title: input.title,
    summary: input.summary,
  });
  await deps.email.sendEmail({ to: input.to, subject: email.subject, html: email.html, textBody: email.textBody });
};
