// PATH: services/api/src/providers/email-resend.ts
// WHAT: Resend HTTP transport for outbound emails
// WHY:  Isolates provider-specific API contract from EmailPort wiring
// RELEVANT: services/api/src/providers/email.ts,services/api/src/providers/email-tls.ts,packages/shared/src/ports/email-port.ts

import { request } from 'node:https';
import type { SendEmailInput } from '@newsroom/shared';
import { buildEmailFrom } from './email-from.js';
import { buildEmailTlsOptionsFromEnv } from './email-tls.js';
import type { Logger } from './logger.js';

const DEFAULT_RESEND_TIMEOUT_MS = 8_000;

const parseResponseText = (text: string): { id?: string; message?: string } => {
  if (!text) return {};
  try {
    return JSON.parse(text) as { id?: string; message?: string };
  } catch {
    return { message: text.slice(0, 500) };
  }
};

const readPositiveInt = (raw: string | undefined, fallback: number): number => {
  const parsed = Number.parseInt(raw ?? '', 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
};

const postResend = async (
  apiKey: string,
  payload: string,
  timeoutMs: number,
): Promise<{ status: number; text: string }> =>
  new Promise((resolve, reject) => {
    const tls = buildEmailTlsOptionsFromEnv();
    const req = request(
      'https://api.resend.com/emails',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload).toString(),
        },
        ca: tls.ca,
        rejectUnauthorized: tls.rejectUnauthorized,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
        res.on('end', () => {
          resolve({
            status: res.statusCode ?? 500,
            text: Buffer.concat(chunks).toString('utf8'),
          });
        });
      },
    );
    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error(`Resend request timeout after ${timeoutMs}ms`));
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });

export const sendWithResend = async (logger: Logger, input: SendEmailInput, replyTo?: string) => {
  const apiKey = process.env.EMAIL_API_KEY;
  if (!apiKey) throw new Error('EMAIL_API_KEY is required for EMAIL_PROVIDER=resend');
  const from = buildEmailFrom(process.env.EMAIL_FROM, input.fromName);
  const payload = JSON.stringify({
    from,
    to: [input.to],
    subject: input.subject,
    html: input.html,
    text: input.textBody,
    reply_to: replyTo,
    tags: input.metadata
      ? Object.entries(input.metadata).map(([name, value]) => ({ name, value }))
      : undefined,
  });
  const timeoutMs = readPositiveInt(process.env.EMAIL_SEND_TIMEOUT_MS, DEFAULT_RESEND_TIMEOUT_MS);
  const response = await postResend(apiKey, payload, timeoutMs);
  const data = parseResponseText(response.text);
  if (response.status < 200 || response.status >= 300 || !data.id) {
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
    from,
    reply_to: replyTo,
  });
  return { messageId: data.id };
};
