// PATH: services/api/src/routes/companies.ts
// WHAT: Company endpoints for authenticated users
// WHY:  Provides tenant context for the web dashboard shell
// RELEVANT: services/api/src/routes/auth-middleware.ts,services/api/src/providers/db/schema.ts

import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { AppError } from '../core/errors';
import { companyTable } from '../providers/db';
import { getAuthUser } from './auth-middleware';
import type { RouteDeps } from './deps';

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

  return router;
};
