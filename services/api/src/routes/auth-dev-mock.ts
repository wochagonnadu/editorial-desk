// PATH: services/api/src/routes/auth-dev-mock.ts
// WHAT: Dev-only magic-link mock token issuance for local login
// WHY:  Lets any dev email login work without a real email provider
// RELEVANT: services/api/src/routes/auth.ts,services/api/src/providers/db/schema/comms-audit.ts

import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { notificationTable } from '../providers/db';
import type { RouteDeps } from './deps';

const isTrue = (value: string | undefined): boolean => {
  if (!value) return false;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
};

export const isDevMockMagicLinkEnabled = (): boolean => {
  if (process.env.NODE_ENV === 'production') return false;
  if (process.env.DEV_MOCK_MAGIC_LINK === undefined) return true;
  return isTrue(process.env.DEV_MOCK_MAGIC_LINK);
};

const tokenForEmail = (email: string): string => {
  const safe = email
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `dev-${safe || 'user'}-token`;
};

export const issueDevMockMagicLink = async (
  deps: RouteDeps,
  input: { companyId: string; email: string },
): Promise<string | null> => {
  if (!isDevMockMagicLinkEnabled()) return null;
  const token = tokenForEmail(input.email);

  await deps.db
    .update(notificationTable)
    .set({ magicLinkRevoked: true } as Partial<typeof notificationTable.$inferInsert>)
    .where(eq(notificationTable.magicLinkToken, token));

  await deps.db.insert(notificationTable).values({
    companyId: input.companyId,
    recipientEmail: input.email,
    notificationType: 'magic_link',
    emailToken: randomUUID(),
    magicLinkToken: token,
    magicLinkExpiresAt: new Date(Date.now() + 72 * 3600_000),
    magicLinkRevoked: false,
    status: 'sent',
    sentAt: new Date(),
  } as unknown as typeof notificationTable.$inferInsert);

  return token;
};
