// PATH: services/api/src/routes/users.ts
// WHAT: Authenticated user endpoints for manager onboarding state
// WHY:  Gives web a server-side source of truth for first-run routing and resume
// RELEVANT: services/api/src/routes/index.ts,services/api/src/routes/user-onboarding-contract.ts

import { and, eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { AppError } from '../core/errors.js';
import { readJsonBodyStrict } from '../core/http/read-json-body.js';
import { userTable } from '../providers/db/index.js';
import { getAuthUser } from './auth-middleware.js';
import type { RouteDeps } from './deps.js';
import { buildOnboardingUpdate, mapOnboardingState } from './user-onboarding-contract.js';

export const buildUserRoutes = (deps: RouteDeps): Hono => {
  const router = new Hono();

  router.get('/me/onboarding', async (context) => {
    const authUser = getAuthUser(context);
    const [user] = await deps.db
      .select()
      .from(userTable)
      .where(and(eq(userTable.id, authUser.userId), eq(userTable.companyId, authUser.companyId)))
      .limit(1);
    if (!user) throw new AppError(404, 'NOT_FOUND', 'User not found');
    return context.json(mapOnboardingState(user));
  });

  router.patch('/me/onboarding', async (context) => {
    const authUser = getAuthUser(context);
    const body = await readJsonBodyStrict<Record<string, unknown>>(context.req.raw);
    const [user] = await deps.db
      .select()
      .from(userTable)
      .where(and(eq(userTable.id, authUser.userId), eq(userTable.companyId, authUser.companyId)))
      .limit(1);
    if (!user) throw new AppError(404, 'NOT_FOUND', 'User not found');

    const [updated] = await deps.db
      .update(userTable)
      .set(buildOnboardingUpdate(body, user))
      .where(eq(userTable.id, authUser.userId))
      .returning();
    return context.json(mapOnboardingState(updated));
  });

  return router;
};
