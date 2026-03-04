// PATH: services/api/src/routes/cron.ts
// WHAT: Daily cron dispatcher for reminders and weekly hooks
// WHY:  Runs scheduled editorial maintenance within Vercel cron limits
// RELEVANT: services/api/src/core/approval.ts,services/api/src/worker/handlers.ts

import { Hono } from 'hono';
import { checkDeadlines } from '../core/approval.js';
import { listOverdueSentSteps } from '../core/onboarding.js';
import { AppError } from '../core/errors.js';
import { sendWeeklyProposals } from '../core/topics.js';
import { approvalReminderJobKey, onboardingReminderJobKey } from '../worker/job-key.js';
import { companyTable } from '../providers/db/index.js';
import { buildDigestCronHandler } from './cron-digest.js';
import { enqueueJob, runQueuedJobs } from './cron-worker.js';
import type { RouteDeps } from './deps.js';

export const assertCronSecret = (authorization: string | undefined) => {
  const expected = process.env.CRON_SECRET;
  if (!expected) throw new AppError(500, 'CONFIG_ERROR', 'CRON_SECRET is not configured');
  if (authorization !== `Bearer ${expected}`)
    throw new AppError(401, 'UNAUTHORIZED', 'Invalid cron token');
};

export const buildCronRoutes = (deps: RouteDeps): Hono => {
  const router = new Hono();
  const digestCron = buildDigestCronHandler(deps, assertCronSecret);

  router.get('/daily', async (context) => {
    assertCronSecret(context.req.header('authorization'));

    const overdueApprovals = await checkDeadlines(deps.db);
    for (const step of overdueApprovals) {
      enqueueJob(deps, {
        name: 'approval.overdue.dispatch',
        jobKey: approvalReminderJobKey(step.id, step.reminderCount + 1),
        payload: { stepId: step.id, reminderCount: step.reminderCount },
        enqueuedAt: new Date().toISOString(),
      });
    }

    const onboardingOverdue = await listOverdueSentSteps({
      db: deps.db,
      email: deps.email,
      logger: deps.logger,
    });
    for (const step of onboardingOverdue) {
      enqueueJob(deps, {
        name: 'onboarding.reminder.cycle',
        jobKey: onboardingReminderJobKey(step.id, step.reminderCount + 1),
        payload: {
          stepId: step.id,
          stepNumber: step.stepNumber,
          reminderCount: step.reminderCount,
          expertId: step.expertId,
        },
        enqueuedAt: new Date().toISOString(),
      });
    }

    const workerTotals = await runQueuedJobs(deps);

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
      reminders_sent: workerTotals.reminders_sent ?? 0,
      escalations_sent: workerTotals.escalations_sent ?? 0,
      onboarding_reminders_sent: workerTotals.onboarding_reminders_sent ?? 0,
      onboarding_escalations_sent: workerTotals.onboarding_escalations_sent ?? 0,
      onboarding_stalled_experts: workerTotals.onboarding_stalled_experts ?? 0,
      weekly_topic_proposals_sent: weeklyTopicProposalsSent,
    });
  });

  router.get('/digest', digestCron);

  return router;
};
