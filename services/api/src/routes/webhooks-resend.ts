// PATH: services/api/src/routes/webhooks-resend.ts
// WHAT: Resend webhook verification and inbound payload normalization
// WHY:  Keeps route handlers focused on business flow, not provider mechanics
// RELEVANT: services/api/src/routes/webhooks.ts,services/api/src/providers/email-resend.ts

import { createHmac, timingSafeEqual } from 'node:crypto';
import { AppError } from '../core/errors';

type InboundPayload = { from?: string; to?: string; textBody?: string; rawBody?: string };

const HEADER_ID = 'svix-id';
const HEADER_TS = 'svix-timestamp';
const HEADER_SIG = 'svix-signature';
const SVIX_TOLERANCE_SECONDS = 300;

const readObject = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : {};

const firstEmail = (value: unknown): string | undefined => {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
  return undefined;
};

const normalizeFrom = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const match = value.match(/<([^>]+)>/);
  return (match?.[1] ?? value).trim().toLowerCase();
};

const parseSvixSignatures = (value: string): string[] =>
  value
    .split(' ')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => entry.split(','))
    .filter((parts) => parts[0] === 'v1' && typeof parts[1] === 'string')
    .map((parts) => parts[1] as string);

const equalSignature = (left: string, right: string): boolean => {
  const leftBytes = Buffer.from(left);
  const rightBytes = Buffer.from(right);
  if (leftBytes.length !== rightBytes.length) return false;
  return timingSafeEqual(leftBytes, rightBytes);
};

export const isSvixSignedRequest = (headers: Headers): boolean =>
  Boolean(headers.get(HEADER_ID) && headers.get(HEADER_TS) && headers.get(HEADER_SIG));

export const verifyResendSignature = (headers: Headers, payload: string) => {
  const id = headers.get(HEADER_ID);
  const timestamp = headers.get(HEADER_TS);
  const signature = headers.get(HEADER_SIG);
  const secret = process.env.EMAIL_WEBHOOK_SECRET;
  if (!id || !timestamp || !signature)
    throw new AppError(401, 'UNAUTHORIZED', 'missing svix headers');
  if (!secret) throw new AppError(500, 'CONFIG_ERROR', 'EMAIL_WEBHOOK_SECRET is not configured');

  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) throw new AppError(401, 'UNAUTHORIZED', 'invalid svix timestamp');
  if (Math.abs(Date.now() / 1000 - ts) > SVIX_TOLERANCE_SECONDS) {
    throw new AppError(401, 'UNAUTHORIZED', 'stale webhook signature');
  }

  const signingSecret = secret.startsWith('whsec_') ? secret.slice(6) : secret;
  const key = Buffer.from(signingSecret, 'base64');
  const expected = createHmac('sha256', key)
    .update(`${id}.${timestamp}.${payload}`)
    .digest('base64');
  const valid = parseSvixSignatures(signature).some((value) => equalSignature(value, expected));
  if (!valid) throw new AppError(401, 'UNAUTHORIZED', 'invalid webhook signature');
};

const getReceivedEmail = async (emailId: string): Promise<Record<string, unknown>> => {
  const apiKey = process.env.EMAIL_API_KEY;
  if (!apiKey) throw new AppError(500, 'CONFIG_ERROR', 'EMAIL_API_KEY is not configured');
  const response = await fetch(`https://api.resend.com/emails/receiving/${emailId}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  const data = readObject(await response.json().catch(() => ({})));
  if (!response.ok) throw new AppError(502, 'UPSTREAM_ERROR', 'failed to retrieve inbound email');
  return data;
};

export const resolveInboundPayload = async (raw: unknown): Promise<InboundPayload> => {
  const body = readObject(raw);
  if (body.type !== 'email.received') {
    return {
      from: normalizeFrom(body.from),
      to: firstEmail(body.to),
      textBody: typeof body.textBody === 'string' ? body.textBody : undefined,
      rawBody: typeof body.rawBody === 'string' ? body.rawBody : undefined,
    };
  }

  const data = readObject(body.data);
  const emailId = typeof data.email_id === 'string' ? data.email_id : undefined;
  if (!emailId)
    throw new AppError(400, 'VALIDATION_ERROR', 'email_id is required for email.received');

  const received = await getReceivedEmail(emailId);
  return {
    from: normalizeFrom(received.from ?? data.from),
    to: firstEmail(received.to ?? data.to),
    textBody: typeof received.text === 'string' ? received.text : undefined,
    rawBody: typeof received.html === 'string' ? received.html : undefined,
  };
};
