// PATH: services/api/src/routes/cron-digest.ts
// WHAT: Digest cron handler for monthly owner report delivery
// WHY:  Keeps digest flow isolated from daily reminder dispatcher
// RELEVANT: services/api/src/routes/cron.ts,services/api/src/core/reports.ts

import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import type { Context } from 'hono';
import { monthlyDigestTemplate } from '../core/email-templates/digest';
import { buildMonthlyReport, monthRange } from '../core/reports';
import { companyTable, notificationTable, userTable } from '../providers/db';
import type { RouteDeps } from './deps';

const currentPeriod = () => {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
};

export const buildDigestCronHandler = (
  deps: RouteDeps,
  assertCronSecret: (authorization: string | undefined) => void,
) => async (context: Context) => {
  assertCronSecret(context.req.header('authorization'));
  const period = context.req.query('month') ?? currentPeriod();
  monthRange(period);

  const companies = await deps.db.select().from(companyTable);
  let digestsSent = 0;

  for (const company of companies) {
    const report = await buildMonthlyReport(deps.db, company.id, period);
    const owners = await deps.db.select().from(userTable).where(and(eq(userTable.companyId, company.id), eq(userTable.role, 'owner')));
    for (const owner of owners) {
      await deps.db.insert(notificationTable).values({
        companyId: company.id,
        recipientEmail: owner.email,
        notificationType: 'digest',
        referenceType: 'company',
        referenceId: company.id,
        emailToken: randomUUID(),
        status: 'sent',
        sentAt: new Date(),
      });
      const message = monthlyDigestTemplate(report);
      await deps.email.sendEmail({ to: owner.email, subject: message.subject, html: message.html, textBody: message.textBody });
      digestsSent += 1;
    }
  }

  return context.json({ digests_sent: digestsSent, period });
};
