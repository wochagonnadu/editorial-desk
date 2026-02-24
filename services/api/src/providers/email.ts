// PATH: services/api/src/providers/email.ts
// WHAT: Console-backed EmailPort adapter with reply token support
// WHY:  Provides provider-agnostic outbound behavior for MVP scaffolding
// RELEVANT: packages/shared/src/ports/email-port.ts,services/api/src/routes/auth.ts

import { createHmac, randomUUID } from 'node:crypto';
import type { EmailPort, ReplyToContext, SendEmailInput, SendMagicLinkInput } from '@newsroom/shared';
import type { Logger } from './logger';

const createReplyToken = (context: ReplyToContext): string => {
  const payload = `${context.draftId}:${context.version}:${context.expertId}`;
  const secret = process.env.EMAIL_WEBHOOK_SECRET ?? 'dev-secret';
  const digest = createHmac('sha256', secret).update(payload).digest('base64url').slice(0, 16);
  return `d_${context.draftId}_v_${context.version}_exp_${context.expertId}_${digest}`;
};

const buildReplyAddress = (context: ReplyToContext): string => {
  const inboundAddress = process.env.EMAIL_INBOUND_ADDRESS ?? 'reply@inbound.newsroom.dev';
  const [local, domain] = inboundAddress.split('@');
  return `${local}+${createReplyToken(context)}@${domain}`;
};

const sendMagicLink = (logger: Logger, input: SendMagicLinkInput): { messageId: string } => {
  const link = `${input.appUrl.replace(/\/$/, '')}/auth/verify?token=${input.token}`;
  const messageId = randomUUID();
  logger.info('email.send', {
    message_id: messageId,
    to: input.to,
    subject: 'Ссылка для входа в редакцию',
    link,
    expires_at: input.expiresAt.toISOString(),
  });
  return { messageId };
};

export const createEmailPort = (logger: Logger): EmailPort => ({
  buildReplyToAddress(context) {
    return buildReplyAddress(context);
  },
  async sendEmail(input: SendEmailInput) {
    const messageId = randomUUID();
    const replyTo = input.replyToContext ? buildReplyAddress(input.replyToContext) : undefined;
    logger.info('email.send', { message_id: messageId, to: input.to, subject: input.subject, reply_to: replyTo });
    return { messageId };
  },
  async sendMagicLink(input: SendMagicLinkInput) {
    return sendMagicLink(logger, input);
  },
});
