// PATH: services/api/src/routes/auth-dev-mock.ts
// WHAT: Dev-only magic-link mock for a fixed email/token pair
// WHY:  Lets local login work without a real email provider
// RELEVANT: services/api/src/routes/auth.ts,services/api/src/providers/db/schema/comms-audit.ts

import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { notificationTable } from '../providers/db';
import type { RouteDeps } from './deps';

export const DEV_MOCK_EMAIL = 'mail@mail.com';
export const DEV_MOCK_TOKEN = 'mail-mail-dev-token';

export const issueDevMockMagicLink = async (
  deps: RouteDeps,
  input: { companyId: string; email: string },
): Promise<string | null> => {
  if (input.email !== DEV_MOCK_EMAIL) return null;

  await deps.db
    .update(notificationTable)
    .set({ magicLinkRevoked: true })
    .where(eq(notificationTable.magicLinkToken, DEV_MOCK_TOKEN));

  await deps.db.insert(notificationTable).values({
    companyId: input.companyId,
    recipientEmail: input.email,
    notificationType: 'magic_link',
    emailToken: randomUUID(),
    magicLinkToken: DEV_MOCK_TOKEN,
    magicLinkExpiresAt: new Date(Date.now() + 72 * 3600_000),
    magicLinkRevoked: false,
    status: 'sent',
    sentAt: new Date(),
  });

  return DEV_MOCK_TOKEN;
};
