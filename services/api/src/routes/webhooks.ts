// PATH: services/api/src/routes/webhooks.ts
// WHAT: Webhook endpoints for inbound expert email replies
// WHY:  Moves onboarding forward through email-first interactions
// RELEVANT: services/api/src/core/onboarding.ts,services/api/src/core/onboarding-finalize.ts

import { Hono } from 'hono';
import { AppError } from '../core/errors.js';
import { createInvalidJsonError } from '../core/http/body-reader-errors.js';
import { readJsonBodyOptional, readRawBodyStrict } from '../core/http/read-json-body.js';
import { finalizeOnboardingVoiceTest } from '../core/onboarding-finalize.js';
import { parseOnboardingReplyAddress, processReply } from '../core/onboarding.js';
import type { RouteDeps } from './deps.js';
import { processApprovalClick } from './webhooks-click.js';
import { processTopicClick } from './webhooks-click-topic.js';
import { processDraftInbound } from './webhooks-inbound-draft.js';
import {
  isSvixSignedRequest,
  resolveInboundPayload,
  verifyResendSignature,
} from './webhooks-resend.js';

interface InboundPayload {
  from?: string;
  to?: string;
  textBody?: string;
  rawBody?: string;
}

const assertSecret = (actual: string | undefined) => {
  const expected = process.env.EMAIL_WEBHOOK_SECRET;
  if (expected && actual !== expected)
    throw new AppError(401, 'UNAUTHORIZED', 'invalid webhook secret');
};

const assertInboundAuth = (headers: Headers, rawBody: string, xSecret: string | undefined) => {
  if (isSvixSignedRequest(headers)) {
    verifyResendSignature(headers, rawBody);
    return;
  }
  assertSecret(xSecret);
};

const parseBody = (rawBody: string): unknown => {
  try {
    return JSON.parse(rawBody || '{}') as unknown;
  } catch {
    throw createInvalidJsonError('Invalid JSON body');
  }
};

export const buildWebhookRoutes = (deps: RouteDeps): Hono => {
  const router = new Hono();
  const approvalClick = processApprovalClick(deps);
  const topicClick = processTopicClick(deps);

  router.post('/email/inbound', async (context) => {
    const rawBody = await readRawBodyStrict(context.req.raw);
    assertInboundAuth(context.req.raw.headers, rawBody, context.req.header('x-webhook-secret'));
    const parsed = parseBody(rawBody);
    const body = (await resolveInboundPayload(parsed)) as InboundPayload;
    deps.logger.info('webhook.inbound.resolved', {
      to: body.to ?? null,
      from: body.from ?? null,
      has_text: Boolean((body.textBody ?? body.rawBody ?? '').trim()),
    });

    const draftResult = await processDraftInbound(deps, body);
    if (draftResult.handled) {
      deps.logger.info('webhook.inbound.draft_handled', { stale: draftResult.stale });
      return context.json({ ok: true, stale: draftResult.stale });
    }

    const to = body.to ?? '';
    if (!to) {
      deps.logger.info('webhook.inbound.ignored', { reason: 'missing_to' });
      return context.json({ ok: true, ignored: true });
    }

    const token = parseOnboardingReplyAddress(to);
    if (!token) {
      deps.logger.info('webhook.inbound.ignored', { reason: 'onboarding_token_not_found', to });
      return context.json({ ok: true, ignored: true });
    }

    const text = body.textBody ?? body.rawBody ?? '';
    if (!text.trim()) {
      deps.logger.info('webhook.inbound.ignored', {
        reason: 'empty_payload_text',
        expert_id: token.expertId,
        step: token.step,
      });
      return context.json({ ok: true, ignored: true });
    }

    const result = await processReply(
      { db: deps.db, email: deps.email },
      token.expertId,
      token.step,
      text,
    );
    if (result.completed) {
      await finalizeOnboardingVoiceTest({ db: deps.db, email: deps.email }, token.expertId);
    }

    if (result.status === 'ignored') {
      deps.logger.info('webhook.inbound.ignored', {
        reason: 'onboarding_reply_ignored',
        code: result.code,
        expert_id: token.expertId,
        step: token.step,
      });
      return context.json({ ok: true, ignored: true, code: result.code });
    }

    deps.logger.info('webhook.inbound_processed', { expert_id: token.expertId, step: token.step });
    return context.json({ ok: true });
  });

  router.post('/email/click', async (context) => {
    assertSecret(context.req.header('x-webhook-secret'));
    const body = await readJsonBodyOptional<Record<string, unknown>>(context.req.raw);
    const actionFromQuery = context.req.query('action');
    const action = actionFromQuery ?? (typeof body?.action === 'string' ? body.action : undefined);
    if (action === 'topic_approve' || action === 'topic_reject')
      return topicClick(context, body ?? {});
    return approvalClick(context, body ?? {});
  });

  router.get('/email/click', async (context) => {
    const action = context.req.query('action');
    if (action === 'topic_approve' || action === 'topic_reject') return topicClick(context);
    return approvalClick(context);
  });

  return router;
};
