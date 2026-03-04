// PATH: services/api/tests/unit/onboarding.test.ts
// WHAT: Unit tests for onboarding reply state machine behavior
// WHY:  Protects 1->5 onboarding sequence from duplicate and order regressions
// RELEVANT: services/api/src/core/onboarding.ts,services/api/src/routes/webhooks.ts

import { describe, expect, it, vi } from 'vitest';
import { processReply } from '../../src/core/onboarding';
import { onboardingSequenceTable } from '../../src/providers/db';

type StepState = {
  id: string;
  stepNumber: number;
  status: 'pending' | 'sent' | 'replied';
  reminderCount: number;
  sentAt: Date | null;
  repliedAt: Date | null;
  responseData: Record<string, unknown> | null;
  createdAt: Date;
};

const createDb = (initialSteps: StepState[]) => {
  const steps = initialSteps;
  const expert = {
    id: 'exp-1',
    name: 'Expert One',
    email: 'expert@example.com',
    companyId: 'cmp-1',
    status: 'onboarding',
  };

  const applyOnboardingUpdate = (values: Record<string, unknown>, viaReturning: boolean) => {
    if (values.status === 'replied') {
      const current = steps.find((step) => step.status === 'sent');
      if (!current) return [];
      current.status = 'replied';
      current.repliedAt = new Date();
      current.responseData = (values.responseData as Record<string, unknown>) ?? null;
      return viaReturning ? [{ id: current.id }] : [];
    }

    if (values.status === 'sent') {
      const next = steps.find((step) => step.status === 'pending');
      if (!next) return [];
      next.status = 'sent';
      next.sentAt = new Date();
      return [];
    }

    return [];
  };

  return {
    select: () => ({
      from: (table: unknown) => ({
        where: () => {
          if (table === onboardingSequenceTable) return Promise.resolve(steps);
          return { limit: async () => [expert] };
        },
      }),
    }),
    update: (table: unknown) => ({
      set: (values: Record<string, unknown>) => ({
        where: () => {
          if (table !== onboardingSequenceTable) return Promise.resolve(undefined);
          return {
            returning: async () => applyOnboardingUpdate(values, true),
            then: (resolve: (value: unknown) => unknown) =>
              resolve(applyOnboardingUpdate(values, false)),
          };
        },
      }),
    }),
  };
};

const createStepStates = (statuses: Array<'pending' | 'sent' | 'replied'>): StepState[] => {
  const now = new Date();
  return statuses.map((status, idx) => ({
    id: `step-${idx + 1}`,
    stepNumber: idx + 1,
    status,
    reminderCount: 0,
    sentAt: status === 'sent' || status === 'replied' ? now : null,
    repliedAt: status === 'replied' ? now : null,
    responseData: status === 'replied' ? { text: 'done' } : null,
    createdAt: now,
  }));
};

describe('onboarding state machine', () => {
  it('handles happy path from step 1 to step 5', async () => {
    const db = createDb(createStepStates(['sent', 'pending', 'pending', 'pending', 'pending']));
    const email = { sendEmail: vi.fn(async () => ({ messageId: 'm-1' })) };
    const context = { db, email } as unknown as Parameters<typeof processReply>[0];

    const r1 = await processReply(context, 'exp-1', 1, 'answer-1');
    const r2 = await processReply(context, 'exp-1', 2, 'answer-2');
    const r3 = await processReply(context, 'exp-1', 3, 'answer-3');
    const r4 = await processReply(context, 'exp-1', 4, 'answer-4');
    const r5 = await processReply(context, 'exp-1', 5, 'answer-5');

    expect(r1).toMatchObject({
      status: 'processed',
      code: 'PROCESSED',
      nextStep: 2,
      completed: false,
    });
    expect(r2).toMatchObject({
      status: 'processed',
      code: 'PROCESSED',
      nextStep: 3,
      completed: false,
    });
    expect(r3).toMatchObject({
      status: 'processed',
      code: 'PROCESSED',
      nextStep: 4,
      completed: false,
    });
    expect(r4).toMatchObject({
      status: 'processed',
      code: 'PROCESSED',
      nextStep: 5,
      completed: false,
    });
    expect(r5).toMatchObject({ status: 'processed', code: 'PROCESSED', completed: true });
    expect(email.sendEmail).toHaveBeenCalledTimes(4);
  });

  it('treats duplicate reply as idempotent already processed', async () => {
    const db = createDb(createStepStates(['sent', 'pending', 'pending', 'pending', 'pending']));
    const email = { sendEmail: vi.fn(async () => ({ messageId: 'm-1' })) };
    const context = { db, email } as unknown as Parameters<typeof processReply>[0];

    await processReply(context, 'exp-1', 1, 'first');
    const duplicate = await processReply(context, 'exp-1', 1, 'duplicate');

    expect(duplicate).toMatchObject({
      status: 'ignored',
      code: 'ALREADY_PROCESSED',
      completed: false,
    });
    expect(email.sendEmail).toHaveBeenCalledTimes(1);
  });

  it('rejects out-of-order reply with invalid order code', async () => {
    const db = createDb(createStepStates(['replied', 'sent', 'sent', 'pending', 'pending']));
    const email = { sendEmail: vi.fn(async () => ({ messageId: 'm-1' })) };
    const context = { db, email } as unknown as Parameters<typeof processReply>[0];

    const result = await processReply(context, 'exp-1', 3, 'out-of-order');

    expect(result).toMatchObject({ status: 'ignored', code: 'INVALID_ORDER', completed: false });
    expect(email.sendEmail).not.toHaveBeenCalled();
  });

  it('returns missing step when reply references non-existent step', async () => {
    const now = new Date();
    const db = createDb([
      {
        id: 'step-1',
        stepNumber: 1,
        status: 'replied',
        reminderCount: 0,
        sentAt: now,
        repliedAt: now,
        responseData: { text: 'done' },
        createdAt: now,
      },
      {
        id: 'step-2',
        stepNumber: 2,
        status: 'replied',
        reminderCount: 0,
        sentAt: now,
        repliedAt: now,
        responseData: { text: 'done' },
        createdAt: now,
      },
      {
        id: 'step-4',
        stepNumber: 4,
        status: 'pending',
        reminderCount: 0,
        sentAt: null,
        repliedAt: null,
        responseData: null,
        createdAt: now,
      },
      {
        id: 'step-5',
        stepNumber: 5,
        status: 'pending',
        reminderCount: 0,
        sentAt: null,
        repliedAt: null,
        responseData: null,
        createdAt: now,
      },
    ]);
    const email = { sendEmail: vi.fn(async () => ({ messageId: 'm-1' })) };
    const context = { db, email } as unknown as Parameters<typeof processReply>[0];

    const result = await processReply(context, 'exp-1', 3, 'missing');

    expect(result).toMatchObject({ status: 'ignored', code: 'MISSING_STEP', completed: false });
  });
});
