// PATH: services/api/src/worker/retry-policy.ts
// WHAT: Default retry/backoff/timeout policy for worker jobs
// WHY:  Keeps retry behavior consistent across all handlers and environments
// RELEVANT: services/api/src/worker/runtime.ts,services/api/src/worker/types.ts

import type { RetryPolicy } from './types.js';

export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxAttempts: 3,
  baseDelayMs: 30_000,
  maxDelayMs: 5 * 60_000,
  timeoutMs: 45_000,
};

export const resolveRetryPolicy = (override?: Partial<RetryPolicy>): RetryPolicy => {
  return {
    maxAttempts: override?.maxAttempts ?? DEFAULT_RETRY_POLICY.maxAttempts,
    baseDelayMs: override?.baseDelayMs ?? DEFAULT_RETRY_POLICY.baseDelayMs,
    maxDelayMs: override?.maxDelayMs ?? DEFAULT_RETRY_POLICY.maxDelayMs,
    timeoutMs: override?.timeoutMs ?? DEFAULT_RETRY_POLICY.timeoutMs,
  };
};

export const calculateBackoffMs = (attempt: number, policy: RetryPolicy): number => {
  if (attempt <= 1) return 0;
  const multiplier = 2 ** (attempt - 2);
  return Math.min(policy.baseDelayMs * multiplier, policy.maxDelayMs);
};
