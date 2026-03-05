// PATH: services/api/src/routes/drafts/publish-plan.ts
// WHAT: Handler for draft publish-plan updates
// WHY:  Calendar and dashboard need explicit scheduled publish source of truth
// RELEVANT: services/api/src/routes/drafts.ts,services/api/src/routes/drafts/query.ts

import { and, eq } from 'drizzle-orm';
import type { Context } from 'hono';
import { AppError } from '../../core/errors.js';
import { readJsonBodyStrict } from '../../core/http/read-json-body.js';
import { draftTable } from '../../providers/db/index.js';
import { getAuthUser } from '../auth-middleware.js';
import type { RouteDeps } from '../deps.js';

const parsePublishPlan = async (context: Context) => {
  const body = await readJsonBodyStrict<Record<string, unknown>>(context.req.raw);
  const rawDate = body.scheduled_publish_at;
  const timezone = typeof body.timezone === 'string' ? body.timezone.trim() : '';

  if (rawDate !== null && typeof rawDate !== 'string') {
    throw new AppError(400, 'VALIDATION_ERROR', 'scheduled_publish_at must be string or null');
  }
  if (rawDate === null) {
    return { scheduledPublishAt: null, publishTimezone: null };
  }
  if (!rawDate) {
    throw new AppError(400, 'VALIDATION_ERROR', 'scheduled_publish_at is required');
  }
  const scheduledPublishAt = new Date(rawDate);
  if (Number.isNaN(scheduledPublishAt.getTime())) {
    throw new AppError(400, 'VALIDATION_ERROR', 'scheduled_publish_at must be valid ISO datetime');
  }
  if (!timezone) {
    throw new AppError(400, 'VALIDATION_ERROR', 'timezone is required when scheduling publish');
  }
  return { scheduledPublishAt, publishTimezone: timezone };
};

export const updateDraftPublishPlan = (deps: RouteDeps) => async (context: Context) => {
  const authUser = getAuthUser(context);
  const draftId = context.req.param('id');
  const { scheduledPublishAt, publishTimezone } = await parsePublishPlan(context);

  const [draft] = await deps.db
    .select()
    .from(draftTable)
    .where(and(eq(draftTable.id, draftId), eq(draftTable.companyId, authUser.companyId)))
    .limit(1);
  if (!draft) throw new AppError(404, 'NOT_FOUND', 'Draft not found');

  const [updated] = await deps.db
    .update(draftTable)
    .set({
      scheduledPublishAt,
      publishTimezone,
      updatedAt: new Date(),
    } as Partial<typeof draftTable.$inferInsert>)
    .where(eq(draftTable.id, draft.id))
    .returning();

  return context.json({
    id: updated.id,
    publish_plan: {
      scheduled_publish_at: updated.scheduledPublishAt,
      timezone: updated.publishTimezone,
      is_scheduled: Boolean(updated.scheduledPublishAt),
    },
  });
};
