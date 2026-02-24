// PATH: services/api/src/routes/topics.ts
// WHAT: Topic listing and manual creation endpoints
// WHY:  Gives managers direct control over editorial pipeline inputs
// RELEVANT: services/api/src/core/drafts.ts,apps/web/src/pages/TopicsPage.tsx

import { and, desc, eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { AppError } from '../core/errors';
import { logAudit } from '../core/audit';
import { expertTable, topicTable } from '../providers/db';
import { getAuthUser } from './auth-middleware';
import type { RouteDeps } from './deps';

export const buildTopicRoutes = (deps: RouteDeps): Hono => {
  const router = new Hono();

  router.get('/', async (context) => {
    const authUser = getAuthUser(context);
    const status = context.req.query('status');
    const expertId = context.req.query('expert_id');
    const predicates = [eq(topicTable.companyId, authUser.companyId)];
    if (status) predicates.push(eq(topicTable.status, status));
    if (expertId) predicates.push(eq(topicTable.expertId, expertId));

    const topics = await deps.db.select().from(topicTable).where(and(...predicates)).orderBy(desc(topicTable.createdAt));
    const expertIds = topics.map((topic) => topic.expertId).filter((id): id is string => Boolean(id));
    const experts = expertIds.length === 0 ? [] : await deps.db.select().from(expertTable).where(eq(expertTable.companyId, authUser.companyId));
    return context.json({
      data: topics.map((topic) => ({
        id: topic.id,
        title: topic.title,
        description: topic.description,
        source_type: topic.sourceType,
        status: topic.status,
        created_at: topic.createdAt,
        expert: topic.expertId ? experts.find((expert) => expert.id === topic.expertId) ?? null : null,
      })),
    });
  });

  router.post('/', async (context) => {
    const authUser = getAuthUser(context);
    const body = (await context.req.json()) as Record<string, unknown>;
    if (typeof body.title !== 'string' || body.title.trim().length < 3) {
      throw new AppError(400, 'VALIDATION_ERROR', 'title is required');
    }

    const [topic] = await deps.db
      .insert(topicTable)
      .values({
        companyId: authUser.companyId,
        expertId: typeof body.expert_id === 'string' ? body.expert_id : null,
        title: body.title.trim(),
        description: typeof body.description === 'string' ? body.description : null,
        sourceType: typeof body.source_type === 'string' ? body.source_type : 'manual',
        status: 'proposed',
        proposedBy: 'manager',
      })
      .returning();

    return context.json({ id: topic.id, status: topic.status }, 201);
  });

  router.post('/:id/approve', async (context) => {
    const authUser = getAuthUser(context);
    const topicId = context.req.param('id');
    const [topic] = await deps.db.select().from(topicTable).where(and(eq(topicTable.id, topicId), eq(topicTable.companyId, authUser.companyId))).limit(1);
    if (!topic) throw new AppError(404, 'NOT_FOUND', 'Topic not found');

    await deps.db.update(topicTable).set({ status: 'approved' }).where(eq(topicTable.id, topic.id));
    await logAudit(deps.db, { companyId: authUser.companyId, actorType: 'user', actorId: authUser.userId, action: 'topic.approved', entityType: 'topic', entityId: topic.id, metadata: { source: 'dashboard' } });
    return context.json({ id: topic.id, status: 'approved' });
  });

  router.post('/:id/reject', async (context) => {
    const authUser = getAuthUser(context);
    const topicId = context.req.param('id');
    const body = (await context.req.json().catch(() => ({}))) as Record<string, unknown>;
    const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
    const [topic] = await deps.db.select().from(topicTable).where(and(eq(topicTable.id, topicId), eq(topicTable.companyId, authUser.companyId))).limit(1);
    if (!topic) throw new AppError(404, 'NOT_FOUND', 'Topic not found');

    await deps.db.update(topicTable).set({ status: 'rejected' }).where(eq(topicTable.id, topic.id));
    await logAudit(deps.db, { companyId: authUser.companyId, actorType: 'user', actorId: authUser.userId, action: 'topic.rejected', entityType: 'topic', entityId: topic.id, metadata: { source: 'dashboard', reason: reason || null } });
    return context.json({ id: topic.id, status: 'rejected' });
  });

  return router;
};
