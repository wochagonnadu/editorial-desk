// PATH: services/api/src/worker/jobs/onboarding-reminder.ts
// WHAT: Worker handler for onboarding reminder/escalation execution
// WHY:  Moves onboarding reminder cycle into queue-based worker path
// RELEVANT: services/api/src/core/onboarding.ts,services/api/src/routes/cron.ts

import { processOnboardingReminderJob } from '../../core/onboarding.js';
import type { WorkerRuntimeDeps } from '../bootstrap.js';

export const runOnboardingReminderJob = async (
  deps: WorkerRuntimeDeps,
  payload: { stepId: string; stepNumber: number; reminderCount: number; expertId: string },
) => {
  const result = await processOnboardingReminderJob(
    { db: deps.db, email: deps.email, logger: deps.logger },
    payload,
  );
  if (result.status === 'ignored') {
    return { status: 'ignored' as const, reason: 'onboarding_not_due' };
  }
  return {
    status: 'succeeded' as const,
    reason: result.escalated ? 'onboarding_escalated' : 'onboarding_reminder_sent',
    metrics: {
      onboarding_reminders_sent: 1,
      onboarding_escalations_sent: result.escalated ? 1 : 0,
      onboarding_stalled_experts: result.stalled ? 1 : 0,
    },
  };
};
