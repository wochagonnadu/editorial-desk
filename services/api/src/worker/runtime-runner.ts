// PATH: services/api/src/worker/runtime-runner.ts
// WHAT: Retry runner for one worker job execution
// WHY:  Keeps runtime entry module short and focused on queue orchestration
// RELEVANT: services/api/src/worker/runtime.ts,services/api/src/worker/retry-policy.ts

import type { Logger } from '../providers/logger.js';
import { calculateBackoffMs } from './retry-policy.js';
import { sleep, withTimeout } from './runtime-utils.js';
import type { RetryPolicy, WorkerJob, WorkerJobHandler, WorkerRunStatus } from './types.js';

interface RunJobParams {
  job: WorkerJob;
  handler: WorkerJobHandler;
  policy: RetryPolicy;
  logger: Logger;
  setState: (status: WorkerRunStatus, attempt: number, lastError?: string) => void;
}

export const runJobWithRetry = async ({
  job,
  handler,
  policy,
  logger,
  setState,
}: RunJobParams): Promise<{ status: WorkerRunStatus; metrics?: Record<string, number> }> => {
  for (let attempt = 1; attempt <= policy.maxAttempts; attempt += 1) {
    const attemptStartedAt = Date.now();
    setState('running', attempt);
    logger.info('worker.job.running', {
      job: job.name,
      key: job.jobKey,
      attempt,
      duration_ms: 0,
      result: 'running',
    });
    try {
      const result = await withTimeout(
        handler(job, { logger, attempt, timeoutMs: policy.timeoutMs }),
        policy.timeoutMs,
      );
      const durationMs = Date.now() - attemptStartedAt;
      setState(result.status, attempt);
      logger.info('worker.job.done', {
        job: job.name,
        key: job.jobKey,
        attempt,
        duration_ms: durationMs,
        result: result.status,
        reason: result.reason,
      });
      return { status: result.status, metrics: result.metrics };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const durationMs = Date.now() - attemptStartedAt;
      const isLastAttempt = attempt >= policy.maxAttempts;
      if (isLastAttempt) {
        setState('failed', attempt, message);
        logger.error('worker.job.failed', {
          job: job.name,
          key: job.jobKey,
          attempt,
          duration_ms: durationMs,
          result: 'failed',
          error_message: message,
        });
        return { status: 'failed' };
      }
      const delayMs = calculateBackoffMs(attempt + 1, policy);
      logger.warn('worker.job.retrying', {
        job: job.name,
        key: job.jobKey,
        attempt,
        duration_ms: durationMs,
        result: 'retrying',
        delay_ms: delayMs,
        error_message: message,
      });
      await sleep(delayMs);
    }
  }
  return { status: 'failed' };
};
