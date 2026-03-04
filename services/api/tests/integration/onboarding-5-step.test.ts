// PATH: services/api/tests/integration/onboarding-5-step.test.ts
// WHAT: Integration test for inbound onboarding flow through step 5 completion
// WHY:  Proves webhook pipeline reaches voice-test finalization trigger end-to-end
// RELEVANT: services/api/src/routes/webhooks.ts,services/api/src/core/onboarding.ts

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RouteDeps } from '../../src/routes/deps';
import { expertTable, onboardingSequenceTable } from '../../src/providers/db';

vi.mock('../../src/core/onboarding-finalize', () => ({
  finalizeOnboardingVoiceTest: vi.fn(async () => ({ draftId: 'draft-1', versionNumber: 1 })),
}));

import { finalizeOnboardingVoiceTest } from '../../src/core/onboarding-finalize';
import { buildWebhookRoutes } from '../../src/routes/webhooks';

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

const createDb = (steps: StepState[]) => {
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
          if (table === expertTable) return { limit: async () => [expert] };
          return { limit: async () => [] };
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

describe('onboarding webhook integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('processes replies from step 1 to step 5 and triggers finalization once', async () => {
    const now = new Date();
    const db = createDb([
      {
        id: 'step-1',
        stepNumber: 1,
        status: 'sent',
        reminderCount: 0,
        sentAt: now,
        repliedAt: null,
        responseData: null,
        createdAt: now,
      },
      ...[2, 3, 4, 5].map((stepNumber) => ({
        id: `step-${stepNumber}`,
        stepNumber,
        status: 'pending' as const,
        reminderCount: 0,
        sentAt: null,
        repliedAt: null,
        responseData: null,
        createdAt: now,
      })),
    ]);

    const logger = {
      child: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };
    logger.child.mockReturnValue(logger);

    const deps = {
      db,
      email: { sendEmail: vi.fn(async () => ({ messageId: 'm-1' })) },
      content: {} as RouteDeps['content'],
      logger,
    } as unknown as RouteDeps;

    const app = buildWebhookRoutes(deps);

    for (let step = 1; step <= 5; step += 1) {
      const response = await app.request('http://localhost/email/inbound', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          from: 'expert@example.com',
          to: `reply+onb_exp_exp-1_step_${step}@vsche.ru`,
          textBody: `answer-${step}`,
        }),
      });

      expect(response.status).toBe(200);
      const payload = (await response.json()) as { ok: boolean };
      expect(payload.ok).toBe(true);
    }

    expect(finalizeOnboardingVoiceTest).toHaveBeenCalledTimes(1);
    expect(finalizeOnboardingVoiceTest).toHaveBeenCalledWith(
      expect.objectContaining({ db: deps.db, email: deps.email }),
      'exp-1',
    );
  });
});
