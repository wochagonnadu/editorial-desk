// PATH: services/api/tests/unit/webhooks-resend.test.ts
// WHAT: Unit tests for inbound payload normalization and onboarding token parsing
// WHY:  Prevents silent onboarding stalls when Resend payload shape changes
// RELEVANT: services/api/src/routes/webhooks-resend.ts,services/api/src/core/onboarding.ts

import { afterEach, vi } from 'vitest';
import { parseOnboardingReplyAddress } from '../../src/core/onboarding';
import { resolveInboundPayload } from '../../src/routes/webhooks-resend';

const originalApiKey = process.env.EMAIL_API_KEY;

afterEach(() => {
  if (originalApiKey === undefined) delete process.env.EMAIL_API_KEY;
  else process.env.EMAIL_API_KEY = originalApiKey;
  vi.unstubAllGlobals();
});

describe('webhooks resend normalization', () => {
  it('normalizes to/from from object and array shapes', async () => {
    const payload = await resolveInboundPayload({
      from: { email: 'EXPERT@MAIL.COM' },
      to: [{ email: 'reply+onb_exp_exp-1_step_1@vsche.ru' }],
      textBody: 'reply',
    });

    expect(payload.from).toBe('expert@mail.com');
    expect(payload.to).toBe('reply+onb_exp_exp-1_step_1@vsche.ru');
    expect(parseOnboardingReplyAddress(payload.to ?? '')).toEqual({ expertId: 'exp-1', step: 1 });
  });

  it('normalizes addresses for email.received payload via retrieve API', async () => {
    process.env.EMAIL_API_KEY = 'resend_test_key';
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              from: [{ email: 'FROM@MAIL.COM' }],
              to: [{ address: 'reply+onb_exp_exp-2_step_2@vsche.ru' }],
              text: 'inbound reply',
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          ),
      ),
    );

    const payload = await resolveInboundPayload({
      type: 'email.received',
      data: { email_id: 'em_1' },
    });

    expect(payload.from).toBe('from@mail.com');
    expect(payload.to).toBe('reply+onb_exp_exp-2_step_2@vsche.ru');
    expect(parseOnboardingReplyAddress(payload.to ?? '')).toEqual({ expertId: 'exp-2', step: 2 });
  });
});
