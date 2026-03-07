// PATH: services/api/src/routes/users.ts
// WHAT: Authenticated user endpoints for onboarding, profile, and setup status
// WHY:  Gives web a server-side source of truth for first-run routing and resume
// RELEVANT: services/api/src/routes/index.ts,services/api/src/routes/user-onboarding-contract.ts,services/api/src/routes/user-profile-contract.ts

import { and, eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { AppError } from '../core/errors.js';
import { readJsonBodyStrict } from '../core/http/read-json-body.js';
import { companyTable, userTable } from '../providers/db/index.js';
import { getAuthUser } from './auth-middleware.js';
import type { RouteDeps } from './deps.js';
import { resolveSetupCompletedAt } from './setup-status.js';
import {
  mapSetupStatusResponse,
  mapUserProfileResponse,
  parseUserProfilePatch,
} from './user-profile-contract.js';
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

  router.get('/me', async (context) => {
    const authUser = getAuthUser(context);
    const [user] = await deps.db
      .select()
      .from(userTable)
      .where(and(eq(userTable.id, authUser.userId), eq(userTable.companyId, authUser.companyId)))
      .limit(1);
    if (!user) throw new AppError(404, 'NOT_FOUND', 'User not found');
    return context.json(mapUserProfileResponse(user));
  });

  router.patch('/me', async (context) => {
    const authUser = getAuthUser(context);
    const body = await readJsonBodyStrict<Record<string, unknown>>(context.req.raw);
    const patch = parseUserProfilePatch(body);
    const [user] = await deps.db
      .select()
      .from(userTable)
      .where(and(eq(userTable.id, authUser.userId), eq(userTable.companyId, authUser.companyId)))
      .limit(1);
    const [company] = await deps.db
      .select()
      .from(companyTable)
      .where(eq(companyTable.id, authUser.companyId))
      .limit(1);
    if (!user || !company) throw new AppError(404, 'NOT_FOUND', 'User not found');

    const [updatedUser] = await deps.db
      .update(userTable)
      .set({ name: patch.name })
      .where(eq(userTable.id, authUser.userId))
      .returning();

    const setupCompletedAt = resolveSetupCompletedAt({
      managerName: patch.name,
      companyName: company.name,
      companyDomain: company.domain,
      companyDescription: company.description,
      setupCompletedAt: company.setupCompletedAt,
    });
    if (setupCompletedAt && company.setupCompletedAt !== setupCompletedAt) {
      await deps.db
        .update(companyTable)
        .set({ setupCompletedAt })
        .where(eq(companyTable.id, authUser.companyId));
    }

    return context.json(mapUserProfileResponse(updatedUser));
  });

  router.get('/me/setup-status', async (context) => {
    const authUser = getAuthUser(context);
    const [company] = await deps.db
      .select()
      .from(companyTable)
      .where(eq(companyTable.id, authUser.companyId))
      .limit(1);
    if (!company) throw new AppError(404, 'NOT_FOUND', 'Company not found');
    return context.json(mapSetupStatusResponse(company));
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
