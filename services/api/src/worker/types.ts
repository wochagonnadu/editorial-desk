// PATH: services/api/src/worker/types.ts
// WHAT: Shared worker contract types for enqueue and execution
// WHY:  Gives one typed shape for job payload, idempotency key, and retries
// RELEVANT: services/api/src/worker/runtime.ts,services/api/src/worker/registry.ts

import type { Logger } from '../providers/logger.js';

export type WorkerJobName =
  | 'approval.overdue.dispatch'
  | 'onboarding.reminder.cycle'
  | 'digest.monthly.send';

export interface RetryPolicy {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  timeoutMs: number;
}

export interface WorkerJobPayloadMap {
  'approval.overdue.dispatch': { stepId: string; reminderCount: number };
  'onboarding.reminder.cycle': {
    stepId: string;
    stepNumber: number;
    reminderCount: number;
    expertId: string;
  };
  'digest.monthly.send': { companyId: string; ownerId: string; period: string };
}

export type WorkerJobPayload<T extends WorkerJobName> = WorkerJobPayloadMap[T];

export interface WorkerJob<T extends WorkerJobName = WorkerJobName> {
  name: T;
  jobKey: string;
  payload: WorkerJobPayload<T>;
  enqueuedAt: string;
  policy?: Partial<RetryPolicy>;
}

export interface WorkerJobContext {
  logger: Logger;
  attempt: number;
  timeoutMs: number;
}

export type WorkerRunStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'ignored';

export interface WorkerJobResult {
  status: 'succeeded' | 'ignored';
  reason?: string;
  metrics?: Record<string, number>;
}

export type WorkerJobHandler<T extends WorkerJobName = WorkerJobName> = (
  job: WorkerJob<T>,
  context: WorkerJobContext,
) => Promise<WorkerJobResult>;

export type WorkerHandlerMap = {
  [Key in WorkerJobName]: WorkerJobHandler<Key>;
};
