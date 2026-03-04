// PATH: services/api/src/worker/jobs/digest-monthly.ts
// WHAT: Worker handler for monthly digest generation and delivery
// WHY:  Runs digest side effects through worker runtime with retry semantics
// RELEVANT: services/api/src/routes/cron-digest.ts,services/api/src/core/reports.ts

import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { monthlyDigestTemplate } from '../../core/email-templates/digest.js';
import { buildMonthlyReport } from '../../core/reports.js';
import { notificationTable, userTable } from '../../providers/db/index.js';
import type { WorkerRuntimeDeps } from '../bootstrap.js';

export const runDigestMonthlyJob = async (
  deps: WorkerRuntimeDeps,
  payload: { companyId: string; ownerId: string; period: string },
) => {
  const [owner] = await deps.db
    .select()
    .from(userTable)
    .where(
      and(
        eq(userTable.id, payload.ownerId),
        eq(userTable.companyId, payload.companyId),
        eq(userTable.role, 'owner'),
      ),
    )
    .limit(1);
  if (!owner) return { status: 'ignored' as const, reason: 'owner_not_found' };

  const report = await buildMonthlyReport(deps.db, payload.companyId, payload.period);
  await deps.db.insert(notificationTable).values({
    companyId: payload.companyId,
    recipientEmail: owner.email,
    notificationType: 'digest',
    referenceType: 'company',
    referenceId: payload.companyId,
    emailToken: randomUUID(),
    status: 'sent',
    sentAt: new Date(),
  } as unknown as typeof notificationTable.$inferInsert);

  const message = monthlyDigestTemplate(report);
  await deps.email.sendEmail({
    to: owner.email,
    subject: message.subject,
    html: message.html,
    textBody: message.textBody,
  });

  return {
    status: 'succeeded' as const,
    reason: 'digest_sent',
    metrics: { digests_sent: 1 },
  };
};
