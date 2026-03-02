// PATH: services/api/src/routes/audit.ts
// WHAT: Audit trail listing endpoint with filters and pagination
// WHY:  Gives managers and owners transparent append-only action history
// RELEVANT: services/api/src/core/audit.ts,apps/web/src/pages/AuditPage.tsx

import { and, desc, eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { authMiddleware, getAuthUser } from './auth-middleware.js';
import type { RouteDeps } from './deps.js';
import { auditLogTable, expertTable, userTable } from '../providers/db/index.js';

const toPositiveInt = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
};

const actorName = async (deps: RouteDeps, actorType: string, actorId: string | null) => {
  if (actorType === 'system' || !actorId) return 'System';
  if (actorType === 'user') {
    const [user] = await deps.db.select().from(userTable).where(eq(userTable.id, actorId)).limit(1);
    return user?.name ?? 'Unknown user';
  }
  const [expert] = await deps.db.select().from(expertTable).where(eq(expertTable.id, actorId)).limit(1);
  return expert?.name ?? 'Unknown expert';
};

export const buildAuditRoutes = (deps: RouteDeps): Hono => {
  const router = new Hono();
  router.use('/*', authMiddleware);

  router.get('/', async (context) => {
    const authUser = getAuthUser(context);
    const entityType = context.req.query('entity_type');
    const entityId = context.req.query('entity_id');
    const limit = Math.min(toPositiveInt(context.req.query('limit'), 50), authUser.role === 'owner' ? 200 : 100);
    const offset = toPositiveInt(context.req.query('offset'), 0);

    const predicates = [eq(auditLogTable.companyId, authUser.companyId)];
    if (entityType) predicates.push(eq(auditLogTable.entityType, entityType));
    if (entityId) predicates.push(eq(auditLogTable.entityId, entityId));
    const where = and(...predicates);

    const rows = await deps.db.select().from(auditLogTable).where(where).orderBy(desc(auditLogTable.createdAt)).limit(limit).offset(offset);
    const total = (await deps.db.select({ id: auditLogTable.id }).from(auditLogTable).where(where)).length;

    const data = await Promise.all(rows.map(async (item) => ({
      id: item.id,
      actor: { type: item.actorType, id: item.actorId, name: await actorName(deps, item.actorType, item.actorId) },
      action: item.action,
      entity_type: item.entityType,
      entity_id: item.entityId,
      draft_version_id: item.draftVersionId,
      metadata: item.metadata,
      created_at: item.createdAt,
    })));

    return context.json({ data, total, limit, offset });
  });

  return router;
};
