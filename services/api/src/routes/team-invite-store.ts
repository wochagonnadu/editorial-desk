// PATH: services/api/src/routes/team-invite-store.ts
// WHAT: DB helpers for team invite member and pending notification lookup
// WHY:  Keeps invite route focused on flow and API response behavior
// RELEVANT: services/api/src/routes/team-invites.ts,services/api/src/providers/db/schema/comms-audit.ts

import { and, desc, eq } from 'drizzle-orm';
import type { UserRole } from '@newsroom/shared';
import { AppError } from '../core/errors.js';
import { notificationTable, userTable } from '../providers/db/index.js';
import type { RouteDeps } from './deps.js';

export const findOrCreateTeamMember = async (
  deps: RouteDeps,
  companyId: string,
  email: string,
  name: string,
  role: UserRole,
) => {
  const [existingUser] = await deps.db
    .select()
    .from(userTable)
    .where(eq(userTable.email, email))
    .limit(1);
  if (existingUser && existingUser.companyId !== companyId) {
    throw new AppError(409, 'CONFLICT', 'Email already belongs to another company');
  }
  if (existingUser) return existingUser;

  return (
    await deps.db
      .insert(userTable)
      .values({ companyId, email, name, role } as typeof userTable.$inferInsert)
      .returning()
  )[0];
};

export const findPendingTeamInvite = async (deps: RouteDeps, companyId: string, email: string) => {
  const [pendingInvite] = await deps.db
    .select()
    .from(notificationTable)
    .where(
      and(
        eq(notificationTable.companyId, companyId),
        eq(notificationTable.recipientEmail, email),
        eq(notificationTable.notificationType, 'team_invite'),
        eq(notificationTable.magicLinkRevoked, false),
      ),
    )
    .orderBy(desc(notificationTable.createdAt))
    .limit(1);
  return pendingInvite;
};
