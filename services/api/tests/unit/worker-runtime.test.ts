// PATH: services/api/tests/unit/worker-runtime.test.ts
// WHAT: Unit tests for worker runtime idempotency and retry behavior
// WHY:  Proves duplicate safety and retry stability for migrated critical jobs
// RELEVANT: services/api/src/worker/runtime.ts,services/api/src/worker/registry.ts

import { describe, expect, it, vi } from 'vitest';
import { createWorkerRegistry } from '../../src/worker/registry';
import { createInMemoryWorkerRuntime } from '../../src/worker/runtime';

const createLogger = () => ({
  child: vi.fn(() => createLogger()),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
});

describe('worker runtime', () => {
  it('ignores duplicate enqueue by jobKey', async () => {
    const handler = vi.fn(async () => ({ status: 'succeeded' as const }));
    const runtime = createInMemoryWorkerRuntime({
      logger: createLogger(),
      registry: createWorkerRegistry({
        'approval.overdue.dispatch': handler,
        'onboarding.reminder.cycle': async () => ({ status: 'ignored' }),
        'digest.monthly.send': async () => ({ status: 'ignored' }),
      }),
    });

    const first = runtime.enqueue({
      name: 'approval.overdue.dispatch',
      jobKey: 'approval_step:s1:reminder:1',
      payload: { stepId: 's1', reminderCount: 0 },
      enqueuedAt: new Date().toISOString(),
    });
    const second = runtime.enqueue({
      name: 'approval.overdue.dispatch',
      jobKey: 'approval_step:s1:reminder:1',
      payload: { stepId: 's1', reminderCount: 0 },
      enqueuedAt: new Date().toISOString(),
    });
    const run = await runtime.runNext();

    expect(first.status).toBe('queued');
    expect(second.status).toBe('ignored');
    expect(run?.status).toBe('succeeded');
    expect(handler).toHaveBeenCalledTimes(1);
  });
  it('retries transient handler errors and then succeeds', async () => {
    const handler = vi
      .fn()
      .mockRejectedValueOnce(new Error('transient'))
      .mockResolvedValueOnce({ status: 'succeeded' as const });
    const runtime = createInMemoryWorkerRuntime({
      logger: createLogger(),
      registry: createWorkerRegistry({
        'approval.overdue.dispatch': async () => ({ status: 'ignored' }),
        'onboarding.reminder.cycle': handler,
        'digest.monthly.send': async () => ({ status: 'ignored' }),
      }),
    });

    runtime.enqueue({
      name: 'onboarding.reminder.cycle',
      jobKey: 'onboarding_step:s2:reminder:1',
      payload: { stepId: 's2', stepNumber: 2, reminderCount: 0, expertId: 'e1' },
      enqueuedAt: new Date().toISOString(),
      policy: { maxAttempts: 2, baseDelayMs: 1, maxDelayMs: 1, timeoutMs: 100 },
    });
    const run = await runtime.runNext();

    expect(run?.status).toBe('succeeded');
    expect(handler).toHaveBeenCalledTimes(2);
  });
  it('returns failed after terminal retry exhaustion', async () => {
    const handler = vi.fn(async () => {
      throw new Error('hard-fail');
    });
    const runtime = createInMemoryWorkerRuntime({
      logger: createLogger(),
      registry: createWorkerRegistry({
        'approval.overdue.dispatch': async () => ({ status: 'ignored' }),
        'onboarding.reminder.cycle': async () => ({ status: 'ignored' }),
        'digest.monthly.send': handler,
      }),
    });

    runtime.enqueue({
      name: 'digest.monthly.send',
      jobKey: 'digest:c1:o1:2026-03',
      payload: { companyId: 'c1', ownerId: 'o1', period: '2026-03' },
      enqueuedAt: new Date().toISOString(),
      policy: { maxAttempts: 2, baseDelayMs: 1, maxDelayMs: 1, timeoutMs: 100 },
    });
    const run = await runtime.runNext();

    expect(run?.status).toBe('failed');
    expect(handler).toHaveBeenCalledTimes(2);
  });
});
