// PATH: services/api/src/providers/email-from.ts
// WHAT: Builds the final outbound From header from EMAIL_FROM and sender name
// WHY:  Keeps one canonical email address while letting expert emails show manager identity
// RELEVANT: services/api/src/providers/email-resend.ts,.env.example,packages/shared/src/ports/email-port.ts

const EMAIL_FROM_FALLBACK = 'Editorial Desk <no-reply@vsche.ru>';

const parseEmailAddress = (from: string): string => {
  const trimmed = from.trim();
  const match = trimmed.match(/^(?:.+<)?([^<>\s]+@[^<>\s]+)>?$/);
  return (match?.[1] ?? trimmed).trim();
};

const normalizeSenderName = (value: string | undefined): string | undefined => {
  const trimmed = value?.trim();
  return trimmed ? trimmed.replace(/["<>]/g, '').trim() : undefined;
};

export const buildEmailFrom = (defaultFrom: string | undefined, senderName?: string): string => {
  const fallback = defaultFrom?.trim() || EMAIL_FROM_FALLBACK;
  const normalizedSenderName = normalizeSenderName(senderName);
  if (!normalizedSenderName) return fallback;
  return `${normalizedSenderName} <${parseEmailAddress(fallback)}>`;
};
