// PATH: services/api/src/routes/webhooks.ts
// WHAT: Webhook endpoints for inbound expert email replies
// WHY:  Moves onboarding forward through email-first interactions
// RELEVANT: services/api/src/core/onboarding.ts,services/api/src/core/onboarding-finalize.ts

import { Hono } from 'hono';
import { AppError } from '../core/errors';
import { finalizeOnboardingVoiceTest } from '../core/onboarding-finalize';
import { parseOnboardingReplyAddress, processReply } from '../core/onboarding';
import type { RouteDeps } from './deps';
import { processApprovalClick } from './webhooks-click';
import { processDraftInbound } from './webhooks-inbound-draft';

interface InboundPayload {
  from?: string;
  to?: string;
  textBody?: string;
  rawBody?: string;
}

const assertSecret = (actual: string | undefined) => {
  const expected = process.env.EMAIL_WEBHOOK_SECRET;
  if (expected && actual !== expected) throw new AppError(401, 'UNAUTHORIZED', 'invalid webhook secret');
};

export const buildWebhookRoutes = (deps: RouteDeps): Hono => {
  const router = new Hono();
  const approvalClick = processApprovalClick(deps);

  router.post('/email/inbound', async (context) => {
    assertSecret(context.req.header('x-webhook-secret'));
    const body = (await context.req.json()) as InboundPayload;

    const draftResult = await processDraftInbound(deps, body);
    if (draftResult.handled) return context.json({ ok: true, stale: draftResult.stale });

    const to = body.to ?? '';
    const token = parseOnboardingReplyAddress(to);
    if (!token) return context.json({ ok: true, ignored: true });

    const text = body.textBody ?? body.rawBody ?? '';
    const result = await processReply({ db: deps.db, email: deps.email }, token.expertId, token.step, text);
    if (result.completed) {
      await finalizeOnboardingVoiceTest({ db: deps.db, email: deps.email }, token.expertId);
    }

    deps.logger.info('webhook.inbound_processed', { expert_id: token.expertId, step: token.step });
    return context.json({ ok: true });
  });

  router.post('/email/click', async (context) => {
    assertSecret(context.req.header('x-webhook-secret'));
    return approvalClick(context);
  });

  router.get('/email/click', approvalClick);

  return router;
};
