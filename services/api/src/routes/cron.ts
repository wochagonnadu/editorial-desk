// PATH: services/api/src/routes/cron.ts
// WHAT: Daily cron dispatcher for reminders and weekly hooks
// WHY:  Runs scheduled editorial maintenance within Vercel cron limits
// RELEVANT: services/api/src/core/approval.ts,services/api/src/core/email-templates/approval.ts

import { eq, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { checkDeadlines } from '../core/approval';
import { reminderTemplate } from '../core/email-templates/approval';
import { AppError } from '../core/errors';
import { sendWeeklyProposals } from '../core/topics';
import {
  approvalFlowTable,
  companyTable,
  draftTable,
  expertTable,
  topicTable,
  userTable,
} from '../providers/db';
import { buildDigestCronHandler } from './cron-digest';
import type { RouteDeps } from './deps';

export const assertCronSecret = (authorization: string | undefined) => {
  const expected = process.env.CRON_SECRET;
  if (!expected) throw new AppError(500, 'CONFIG_ERROR', 'CRON_SECRET is not configured');
  if (authorization !== `Bearer ${expected}`)
    throw new AppError(401, 'UNAUTHORIZED', 'Invalid cron token');
};

const approverEmail = async (deps: RouteDeps, approverType: string, approverId: string) => {
  if (approverType === 'user') {
    const [user] = await deps.db
      .select()
      .from(userTable)
      .where(eq(userTable.id, approverId))
      .limit(1);
    return user?.email ?? null;
  }
  const [expert] = await deps.db
    .select()
    .from(expertTable)
    .where(eq(expertTable.id, approverId))
    .limit(1);
  return expert?.email ?? null;
};

const findUserEmail = async (deps: RouteDeps, userId: string) => {
  const [user] = await deps.db.select().from(userTable).where(eq(userTable.id, userId)).limit(1);
  return user?.email ?? null;
};

export const buildCronRoutes = (deps: RouteDeps): Hono => {
  const router = new Hono();
  const digestCron = buildDigestCronHandler(deps, assertCronSecret);

  router.get('/daily', async (context) => {
    assertCronSecret(context.req.header('authorization'));

    const overdue = await checkDeadlines(deps.db);
    let remindersSent = 0;
    let escalationsSent = 0;

    for (const step of overdue) {
      const [flow] = await deps.db
        .select()
        .from(approvalFlowTable)
        .where(eq(approvalFlowTable.id, step.approvalFlowId))
        .limit(1);
      if (!flow) continue;
      const [draft] = await deps.db
        .select()
        .from(draftTable)
        .where(eq(draftTable.id, flow.draftId))
        .limit(1);
      if (!draft) continue;
      const [topic] = await deps.db
        .select()
        .from(topicTable)
        .where(eq(topicTable.id, draft.topicId))
        .limit(1);
      const email = await approverEmail(deps, step.approverType, step.approverId);
      if (!email || !step.deadlineAt) continue;

      const template = reminderTemplate(topic?.title ?? 'Draft', step.deadlineAt);
      await deps.email.sendEmail({
        to: email,
        subject: template.subject,
        html: template.html,
        textBody: template.textBody,
      });
      remindersSent += 1;

      await deps.db.execute(
        sql`update approval_step set reminder_count = reminder_count + 1 where id = ${step.id}`,
      );

      if (step.reminderCount >= 2) {
        const ownerEmail = await findUserEmail(deps, flow.createdBy);
        if (ownerEmail) {
          await deps.email.sendEmail({
            to: ownerEmail,
            subject: `Escalation: approval stalled for ${topic?.title ?? 'Draft'}`,
            textBody: `Approval step ${step.stepOrder} is overdue after ${step.reminderCount + 1} reminders.`,
            html: `<p>Approval step <strong>${step.stepOrder}</strong> is overdue after ${step.reminderCount + 1} reminders.</p>`,
          });
          escalationsSent += 1;
        }
      }
    }

    let weeklyTopicProposalsSent = 0;
    if (new Date().getUTCDay() === 1) {
      const companies = await deps.db.select().from(companyTable);
      for (const company of companies) {
        weeklyTopicProposalsSent += await sendWeeklyProposals(
          { db: deps.db, email: deps.email, content: deps.content },
          company.id,
        );
      }
    }

    return context.json({
      reminders_sent: remindersSent,
      escalations_sent: escalationsSent,
      weekly_topic_proposals_sent: weeklyTopicProposalsSent,
    });
  });

  router.get('/digest', digestCron);

  return router;
};
