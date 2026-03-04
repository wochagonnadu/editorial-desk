// PATH: services/api/src/worker/runtime.ts
// WHAT: In-memory worker runtime with idempotent enqueue and retries
// WHY:  Gives a minimal executable contract before queue migration in Phase C
// RELEVANT: services/api/src/worker/retry-policy.ts,services/api/src/worker/registry.ts

import { resolveRetryPolicy } from './retry-policy.js';
import type { WorkerRegistry } from './registry.js';
import type { Logger } from '../providers/logger.js';
import { runJobWithRetry } from './runtime-runner.js';
import type { WorkerJob, WorkerRunStatus } from './types.js';

interface WorkerState {
  status: WorkerRunStatus;
  attempts: number;
  lastError?: string;
}

export interface WorkerRuntime {
  enqueue(job: WorkerJob): { status: 'queued' | 'ignored'; jobKey: string };
  runNext(): Promise<{
    jobKey: string;
    jobName: WorkerJob['name'];
    status: WorkerRunStatus;
    metrics?: Record<string, number>;
  } | null>;
  getStatus(jobKey: string): WorkerRunStatus | null;
}

export const createInMemoryWorkerRuntime = (deps: {
  registry: WorkerRegistry;
  logger: Logger;
}): WorkerRuntime => {
  const queue: string[] = [];
  const jobs = new Map<string, WorkerJob>();
  const state = new Map<string, WorkerState>();

  const setState = (jobKey: string, next: WorkerState) => {
    state.set(jobKey, next);
  };

  return {
    enqueue(job) {
      const existing = state.get(job.jobKey);
      if (existing) {
        deps.logger.info('worker.job.ignored', {
          job: job.name,
          key: job.jobKey,
          attempt: existing.attempts,
          duration_ms: 0,
          result: 'ignored',
          reason: 'duplicate_job_key',
          previous_status: existing.status,
        });
        return { status: 'ignored', jobKey: job.jobKey };
      }
      jobs.set(job.jobKey, job);
      setState(job.jobKey, { status: 'queued', attempts: 0 });
      queue.push(job.jobKey);
      deps.logger.info('worker.job.queued', {
        job: job.name,
        key: job.jobKey,
        attempt: 0,
        duration_ms: 0,
        result: 'queued',
      });
      return { status: 'queued', jobKey: job.jobKey };
    },
    async runNext() {
      const jobKey = queue.shift();
      if (!jobKey) return null;
      const job = jobs.get(jobKey);
      if (!job) return null;

      const policy = resolveRetryPolicy(job.policy);
      const handler = deps.registry.get(job.name);
      setState(jobKey, { status: 'running', attempts: 0 });
      const executed = await runJobWithRetry({
        job,
        handler,
        policy,
        logger: deps.logger,
        setState(status, attempt, lastError) {
          setState(jobKey, { status, attempts: attempt, lastError });
        },
      });
      return {
        jobKey,
        jobName: job.name,
        status: executed.status,
        metrics: executed.metrics,
      };
    },
    getStatus(jobKey) {
      return state.get(jobKey)?.status ?? null;
    },
  };
};
