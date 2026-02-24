// PATH: services/api/src/routes/topics.ts
// WHAT: Topic listing and manual creation endpoints
// WHY:  Gives managers direct control over editorial pipeline inputs
// RELEVANT: services/api/src/core/drafts.ts,apps/web/src/pages/TopicsPage.tsx

import { and, eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { AppError } from '../core/errors';
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

    const topics = await deps.db.select().from(topicTable).where(and(...predicates));
    const expertIds = topics.map((topic) => topic.expertId).filter((id): id is string => Boolean(id));
    const experts = expertIds.length === 0 ? [] : await deps.db.select().from(expertTable).where(eq(expertTable.companyId, authUser.companyId));
    return context.json({
      data: topics.map((topic) => ({
        id: topic.id,
        title: topic.title,
        description: topic.description,
        source_type: topic.sourceType,
        status: topic.status,
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

  return router;
};
