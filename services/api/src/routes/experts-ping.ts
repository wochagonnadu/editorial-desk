// PATH: services/api/src/routes/experts-ping.ts
// WHAT: Handler for "Request 2 minutes" expert reminder action
// WHY:  FR-032 — lets manager nudge unresponsive expert via short email
// RELEVANT: services/api/src/routes/experts.ts,services/api/src/core/audit.ts

import type { Context } from 'hono';
import { logAudit } from '../core/audit.js';
import { findSenderNameByUserId } from '../core/email-sender.js';
import { AppError } from '../core/errors.js';
import type { DrizzleExpertStore } from '../providers/db/index.js';
import { getAuthUser } from './auth-middleware.js';
import type { RouteDeps } from './deps.js';

const buildPingMessage = (name: string) => {
  const subject = 'Request 2 minutes';
  const textBody = `Hi ${name},\n\nCould you share a quick update when you have 2 minutes?\n\nThank you.`;
  const html = `<p>Hi ${name},</p><p>Could you share a quick update when you have 2 minutes?</p><p>Thank you.</p>`;
  return { subject, textBody, html };
};

export const requestTwoMinutes =
  (deps: RouteDeps, expertStore: DrizzleExpertStore) => async (context: Context) => {
    const authUser = getAuthUser(context);
    const expertId = context.req.param('id');
    const log = deps.logger.child({
      module: 'experts.ping',
      company_id: authUser.companyId,
      expert_id: expertId,
      actor: authUser.userId,
    });

    const expert = await expertStore.findById(expertId, authUser.companyId);
    if (!expert) throw new AppError(404, 'NOT_FOUND', 'Expert not found');

    log.info('experts.ping.requested');
    const message = buildPingMessage(expert.name);
    const fromName = await findSenderNameByUserId(deps.db, authUser.userId);
    await deps.email.sendEmail({
      to: expert.email,
      subject: message.subject,
      html: message.html,
      textBody: message.textBody,
      fromName,
    });

    await logAudit(deps.db, {
      companyId: authUser.companyId,
      actorType: 'user',
      actorId: authUser.userId,
      action: 'expert.request_2_minutes',
      entityType: 'expert',
      entityId: expert.id,
      metadata: { email: expert.email },
    });

    log.info('experts.ping.sent', { recipient: expert.email });
    return context.json({ ok: true });
  };
