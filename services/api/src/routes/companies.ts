// PATH: services/api/src/routes/companies.ts
// WHAT: Company endpoints for authenticated users
// WHY:  Provides tenant context for the web dashboard shell
// RELEVANT: services/api/src/routes/auth-middleware.ts,services/api/src/routes/company-patch.ts,services/api/src/routes/company-generation-preview.ts

import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { logAudit } from '../core/audit.js';
import { AppError } from '../core/errors.js';
import { readJsonBodyStrict } from '../core/http/read-json-body.js';
import { companyTable } from '../providers/db/index.js';
import { getAuthUser } from './auth-middleware.js';
import { previewCompanyGeneration } from './company-generation-preview.js';
import { parseCompanyPatch } from './company-patch.js';
import {
  buildCompanyUpdateFromPatch,
  mapCompanySettingsResponse,
} from './company-settings-mapper.js';
import type { RouteDeps } from './deps.js';

export const buildCompanyRoutes = (deps: RouteDeps): Hono => {
  const router = new Hono();

  router.post('/me/generation-preview', previewCompanyGeneration(deps));

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

    return context.json(mapCompanySettingsResponse(company));
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

    const { updateValues, changedFields, policySections } = buildCompanyUpdateFromPatch(
      company,
      patch,
    );
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
        changed_fields: changedFields,
        generation_policy_changed: policySections.length > 0,
        generation_policy_changed_sections: policySections,
      },
    });

    return context.json(mapCompanySettingsResponse(updatedCompany));
  });

  return router;
};
