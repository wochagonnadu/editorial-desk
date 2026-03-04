// PATH: services/api/src/worker/handlers.ts
// WHAT: Worker handlers factory for migrated background jobs
// WHY:  Centralizes queue execution while cron remains public trigger only
// RELEVANT: services/api/src/worker/jobs/approval-overdue.ts,services/api/src/worker/jobs/digest-monthly.ts

import { runApprovalOverdueJob } from './jobs/approval-overdue.js';
import { runDigestMonthlyJob } from './jobs/digest-monthly.js';
import { runOnboardingReminderJob } from './jobs/onboarding-reminder.js';
import type { WorkerRuntimeDeps } from './bootstrap.js';
import type { WorkerHandlerMap } from './types.js';

export const createWorkerHandlers = (deps: WorkerRuntimeDeps): WorkerHandlerMap => ({
  'approval.overdue.dispatch': async (job) => runApprovalOverdueJob(deps, job.payload),
  'onboarding.reminder.cycle': async (job) => runOnboardingReminderJob(deps, job.payload),
  'digest.monthly.send': async (job) => runDigestMonthlyJob(deps, job.payload),
});

export const workerHandlers: WorkerHandlerMap = {
  'approval.overdue.dispatch': async () => ({ status: 'ignored', reason: 'worker_deps_required' }),
  'onboarding.reminder.cycle': async () => ({ status: 'ignored', reason: 'worker_deps_required' }),
  'digest.monthly.send': async () => ({ status: 'ignored', reason: 'worker_deps_required' }),
};
