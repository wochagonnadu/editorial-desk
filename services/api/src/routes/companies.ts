// PATH: services/api/src/routes/companies.ts
// WHAT: Company endpoints for authenticated users
// WHY:  Provides tenant context for the web dashboard shell
// RELEVANT: services/api/src/routes/auth-middleware.ts,services/api/src/routes/company-patch.ts

import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { logAudit } from '../core/audit.js';
import { AppError } from '../core/errors.js';
import { readJsonBodyStrict } from '../core/http/read-json-body.js';
import { companyTable } from '../providers/db/index.js';
import { getAuthUser } from './auth-middleware.js';
import { parseCompanyPatch } from './company-patch.js';
import type { RouteDeps } from './deps.js';

export const buildCompanyRoutes = (deps: RouteDeps): Hono => {
  const router = new Hono();

  router.get('/me', async (context) => {
    const authUser = getAuthUser(context);
    const [company] = await deps.db
      .select()
      .from(companyTable)
      .where(eq(companyTable.id, authUser.companyId))
      .limit(1);

    if (!company) {
      throw new AppError(404, 'NOT_FOUND', 'Company not found');
    }

    return context.json({
      id: company.id,
      name: company.name,
      domain: company.domain,
      language: company.language,
    });
  });

  router.patch('/me', async (context) => {
    const authUser = getAuthUser(context);
    if (authUser.role !== 'owner') {
      throw new AppError(403, 'FORBIDDEN', 'Only owner can update workspace settings');
    }

    const body = await readJsonBodyStrict<Record<string, unknown>>(context.req.raw);
    const patch = parseCompanyPatch(body);
    const [company] = await deps.db
      .select()
      .from(companyTable)
      .where(eq(companyTable.id, authUser.companyId))
      .limit(1);
    if (!company) {
      throw new AppError(404, 'NOT_FOUND', 'Company not found');
    }

    const updateValues = {
      ...patch,
      updatedAt: new Date(),
    } as Partial<typeof companyTable.$inferInsert>;
    const [updatedCompany] = await deps.db
      .update(companyTable)
      .set(updateValues)
      .where(eq(companyTable.id, authUser.companyId))
      .returning();

    await logAudit(deps.db, {
      companyId: authUser.companyId,
      actorType: 'user',
      actorId: authUser.userId,
      action: 'company.settings_updated',
      entityType: 'company',
      entityId: authUser.companyId,
      metadata: {
        changed_fields: Object.keys(patch).filter(
          (key) => patch[key as keyof typeof patch] !== undefined,
        ),
      },
    });

    return context.json({
      id: updatedCompany.id,
      name: updatedCompany.name,
      domain: updatedCompany.domain,
      language: updatedCompany.language,
    });
  });

  return router;
};
