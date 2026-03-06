// PATH: services/api/src/core/email-sender.ts
// WHAT: Resolves human sender names for expert-facing emails
// WHY:  Centralizes user-name lookup so routes and workflows stay small
// RELEVANT: services/api/src/core/onboarding.ts,services/api/src/routes/approval-notify.ts,services/api/src/providers/db/schema/company-user.ts

import { eq } from 'drizzle-orm';
import { userTable } from '../providers/db/index.js';
import type { Database } from '../providers/db/pool.js';

export const findSenderNameByUserId = async (
  db: Database,
  userId: string | null | undefined,
): Promise<string | undefined> => {
  if (!userId) return undefined;
  const [user] = await db.select().from(userTable).where(eq(userTable.id, userId)).limit(1);
  const name = user?.name?.trim();
  return name || undefined;
};
