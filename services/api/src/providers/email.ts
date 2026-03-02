// PATH: services/api/src/providers/email.ts
// WHAT: EmailPort adapter with stub and Resend outbound providers
// WHY:  Keeps email delivery pluggable while preserving one app interface
// RELEVANT: packages/shared/src/ports/email-port.ts,services/api/src/routes/auth.ts,services/api/src/providers/email-resend.ts

import { createHmac, randomUUID } from 'node:crypto';
import type {
  EmailPort,
  ReplyToContext,
  SendEmailInput,
  SendMagicLinkInput,
} from '@newsroom/shared';
import type { Logger } from './logger.js';
import { sendWithResend } from './email-resend.js';

const createReplyToken = (context: ReplyToContext): string => {
  const payload = `${context.draftId}:${context.version}:${context.expertId}`;
  const secret = process.env.EMAIL_WEBHOOK_SECRET ?? 'dev-secret';
  const digest = createHmac('sha256', secret).update(payload).digest('base64url').slice(0, 16);
  return `d_${context.draftId}_v_${context.version}_exp_${context.expertId}_${digest}`;
};

const buildReplyAddress = (context: ReplyToContext): string => {
  const inboundAddress = process.env.EMAIL_INBOUND_ADDRESS ?? 'reply@vsche.ru';
  const [local, domain] = inboundAddress.split('@');
  return `${local}+${createReplyToken(context)}@${domain}`;
};

const sendWithStub = async (logger: Logger, input: SendEmailInput, replyTo?: string) => {
  const messageId = randomUUID();
  logger.info('email.send', {
    provider: 'stub',
    message_id: messageId,
    to: input.to,
    subject: input.subject,
    reply_to: replyTo,
  });
  return { messageId };
};

const sendByProvider = async (logger: Logger, input: SendEmailInput, replyTo?: string) => {
  const provider = (process.env.EMAIL_PROVIDER ?? 'stub').toLowerCase();
  if (provider === 'resend') return sendWithResend(logger, input, replyTo);
  return sendWithStub(logger, input, replyTo);
};

const magicLinkEmail = (input: SendMagicLinkInput): SendEmailInput => {
  const link = `${input.appUrl.replace(/\/$/, '')}/auth/verify?token=${input.token}`;
  const expires = input.expiresAt.toISOString();
  return {
    to: input.to,
    subject: 'Ссылка для входа в редакцию',
    html: `<p>Откройте ссылку для входа:</p><p><a href="${link}">${link}</a></p><p>Ссылка действует до ${expires}.</p>`,
    textBody: `Откройте ссылку для входа: ${link}. Ссылка действует до ${expires}.`,
    metadata: { kind: 'magic_link' },
  };
};

export const createEmailPort = (logger: Logger): EmailPort => ({
  buildReplyToAddress(context) {
    return buildReplyAddress(context);
  },
  async sendEmail(input) {
    const replyTo =
      input.replyTo ?? (input.replyToContext ? buildReplyAddress(input.replyToContext) : undefined);
    return sendByProvider(logger, input, replyTo);
  },
  async sendMagicLink(input) {
    return sendByProvider(logger, magicLinkEmail(input));
  },
});
