// PATH: services/api/src/routes/team-users.ts
// WHAT: Team users read and role update handlers
// WHY:  Exposes minimal team management contracts for Settings screen
// RELEVANT: services/api/src/routes/team.ts,services/api/src/providers/db/schema/company-user.ts

import { and, eq } from 'drizzle-orm';
import type { Context } from 'hono';
import { logAudit } from '../core/audit.js';
import { AppError } from '../core/errors.js';
import { readJsonBodyStrict } from '../core/http/read-json-body.js';
import { userTable } from '../providers/db/index.js';
import { getAuthUser } from './auth-middleware.js';
import type { RouteDeps } from './deps.js';
import { assertOwnerRole, parseTeamRole } from './team-shared.js';

export const listTeamUsers = (deps: RouteDeps) => async (context: Context) => {
  const authUser = getAuthUser(context);
  const users = await deps.db
    .select()
    .from(userTable)
    .where(eq(userTable.companyId, authUser.companyId));

  return context.json({
    data: users.map((user) => ({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      status: 'active',
    })),
  });
};

export const updateTeamUserRole = (deps: RouteDeps) => async (context: Context) => {
  const authUser = getAuthUser(context);
  assertOwnerRole(authUser, 'Only owner can change team roles');
  const userId = context.req.param('id');
  if (userId === authUser.userId) {
    throw new AppError(409, 'CONFLICT', 'You cannot change your own role');
  }

  const body = await readJsonBodyStrict<Record<string, unknown>>(context.req.raw);
  const nextRole = parseTeamRole(body.role);
  const [target] = await deps.db
    .select()
    .from(userTable)
    .where(and(eq(userTable.id, userId), eq(userTable.companyId, authUser.companyId)))
    .limit(1);
  if (!target) throw new AppError(404, 'NOT_FOUND', 'Team user not found');

  if (target.role !== nextRole) {
    await deps.db
      .update(userTable)
      .set({ role: nextRole } as Partial<typeof userTable.$inferInsert>)
      .where(eq(userTable.id, target.id));
    await logAudit(deps.db, {
      companyId: authUser.companyId,
      actorType: 'user',
      actorId: authUser.userId,
      action: 'team.role_updated',
      entityType: 'user',
      entityId: target.id,
      metadata: { from_role: target.role, to_role: nextRole },
    });
  }

  return context.json({ id: target.id, role: nextRole, unchanged: target.role === nextRole });
};
