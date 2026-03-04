// PATH: services/api/src/routes/cron-worker.ts
// WHAT: Helpers for enqueueing and draining worker jobs in cron routes
// WHY:  Keeps cron endpoints as stable triggers while execution lives in worker
// RELEVANT: services/api/src/routes/cron.ts,services/api/src/routes/cron-digest.ts

import type { WorkerJob } from '../worker/types.js';
import type { RouteDeps } from './deps.js';

export const enqueueJob = (deps: RouteDeps, job: WorkerJob) => {
  if (!deps.worker) throw new Error('worker_runtime_not_configured');
  return deps.worker.enqueue(job).status === 'queued';
};

export const runQueuedJobs = async (deps: RouteDeps) => {
  if (!deps.worker) throw new Error('worker_runtime_not_configured');
  const totals: Record<string, number> = {};
  for (;;) {
    const run = await deps.worker.runNext();
    if (!run) break;
    if (!run.metrics) continue;
    for (const [key, value] of Object.entries(run.metrics)) {
      totals[key] = (totals[key] ?? 0) + value;
    }
  }
  return totals;
};
