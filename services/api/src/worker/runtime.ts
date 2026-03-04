// PATH: services/api/src/worker/runtime.ts
// WHAT: In-memory worker runtime with idempotent enqueue and retries
// WHY:  Gives a minimal executable contract before queue migration in Phase C
// RELEVANT: services/api/src/worker/retry-policy.ts,services/api/src/worker/registry.ts

import { calculateBackoffMs, resolveRetryPolicy } from './retry-policy.js';
import type { WorkerRegistry } from './registry.js';
import type { Logger } from '../providers/logger.js';
import type { WorkerJob } from './types.js';
import { sleep, withTimeout } from './runtime-utils.js';

export type WorkerRunStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'ignored';

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
}

export const createInMemoryWorkerRuntime = (deps: {
  registry: WorkerRegistry;
  logger: Logger;
}): WorkerRuntime => {
  const queue: string[] = [];
  const jobs = new Map<string, WorkerJob>();
  const state = new Map<string, WorkerState>();

  return {
    enqueue(job) {
      if (state.has(job.jobKey)) return { status: 'ignored', jobKey: job.jobKey };
      jobs.set(job.jobKey, job);
      state.set(job.jobKey, { status: 'queued', attempts: 0 });
      queue.push(job.jobKey);
      deps.logger.info('worker.job.queued', { job: job.name, key: job.jobKey, result: 'queued' });
      return { status: 'queued', jobKey: job.jobKey };
    },
    async runNext() {
      const jobKey = queue.shift();
      if (!jobKey) return null;
      const job = jobs.get(jobKey);
      if (!job) return null;

      const policy = resolveRetryPolicy(job.policy);
      const handler = deps.registry.get(job.name);
      state.set(jobKey, { status: 'running', attempts: 0 });

      for (let attempt = 1; attempt <= policy.maxAttempts; attempt += 1) {
        state.set(jobKey, { status: 'running', attempts: attempt });
        try {
          const result = await withTimeout(
            handler(job, { logger: deps.logger, attempt, timeoutMs: policy.timeoutMs }),
            policy.timeoutMs,
          );
          state.set(jobKey, { status: result.status, attempts: attempt });
          deps.logger.info('worker.job.done', {
            job: job.name,
            key: jobKey,
            attempt,
            result: result.status,
            reason: result.reason,
          });
          return { jobKey, jobName: job.name, status: result.status, metrics: result.metrics };
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          const isLastAttempt = attempt >= policy.maxAttempts;
          if (isLastAttempt) {
            state.set(jobKey, { status: 'failed', attempts: attempt, lastError: message });
            deps.logger.error('worker.job.failed', {
              job: job.name,
              key: jobKey,
              attempt,
              result: 'failed',
              error_message: message,
            });
            return { jobKey, jobName: job.name, status: 'failed' };
          }
          const delayMs = calculateBackoffMs(attempt + 1, policy);
          deps.logger.warn('worker.job.retrying', {
            job: job.name,
            key: jobKey,
            attempt,
            result: 'retrying',
            delay_ms: delayMs,
            error_message: message,
          });
          await sleep(delayMs);
        }
      }
      return { jobKey, jobName: job.name, status: 'failed' };
    },
  };
};
