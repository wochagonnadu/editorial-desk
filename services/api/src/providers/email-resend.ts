// PATH: services/api/src/providers/email-resend.ts
// WHAT: Resend HTTP transport for outbound emails
// WHY:  Isolates provider-specific API contract from EmailPort wiring
// RELEVANT: services/api/src/providers/email.ts,packages/shared/src/ports/email-port.ts

import type { SendEmailInput } from '@newsroom/shared';
import type { Logger } from './logger';

const parseResponse = async (response: Response): Promise<{ id?: string; message?: string }> => {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as { id?: string; message?: string };
  } catch {
    return { message: text.slice(0, 500) };
  }
};

export const sendWithResend = async (logger: Logger, input: SendEmailInput, replyTo?: string) => {
  const apiKey = process.env.EMAIL_API_KEY;
  if (!apiKey) throw new Error('EMAIL_API_KEY is required for EMAIL_PROVIDER=resend');
  const from = process.env.EMAIL_FROM ?? 'Editorial Desk <no-reply@vsche.ru>';
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: input.subject,
      html: input.html,
      text: input.textBody,
      reply_to: replyTo,
      tags: input.metadata
        ? Object.entries(input.metadata).map(([name, value]) => ({ name, value }))
        : undefined,
    }),
  });
  const data = await parseResponse(response);
  if (!response.ok || !data.id) {
    logger.error('email.resend_send_failed', {
      status: response.status,
      response: data.message ?? null,
    });
    throw new Error('Resend send failed');
  }
  logger.info('email.send', {
    provider: 'resend',
    message_id: data.id,
    to: input.to,
    subject: input.subject,
    reply_to: replyTo,
  });
  return { messageId: data.id };
};
